import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../../infra/prisma/prisma.service';
import { slugify, randomSuffix } from '../../shared/utils/slug';
import { seedDefaultBoard } from '../../shared/utils/seed-default-board';
import { StripeService } from '../billing/stripe.service';
import { PLANS } from '../billing/plans';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly stripe: StripeService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('E-mail já cadastrado');

    // Em produção, com Stripe configurado, cartão é obrigatório no trial.
    if (this.stripe.enabled && !dto.stripePaymentMethodId) {
      throw new BadRequestException(
        'É necessário informar um cartão para iniciar o período de teste.',
      );
    }

    const passwordHash = await argon2.hash(dto.password);
    const baseSlug = slugify(dto.workspaceName) || 'workspace';
    const slug = `${baseSlug}-${randomSuffix()}`;

    const trialDays = PLANS.TRIAL.trialDays;
    const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000);

    // Pré-cria customer no Stripe (fora da transação DB, pra não segurar lock)
    let stripeCustomerId: string | null = null;
    if (this.stripe.enabled && dto.stripePaymentMethodId) {
      try {
        const customer = await this.stripe.stripe.customers.create({
          email: dto.email.toLowerCase(),
          name: dto.name,
          payment_method: dto.stripePaymentMethodId,
          invoice_settings: {
            default_payment_method: dto.stripePaymentMethodId,
          },
        });
        stripeCustomerId = customer.id;
      } catch (err) {
        this.log.error(
          `Falha ao criar customer Stripe no signup: ${(err as Error).message}`,
        );
        throw new BadRequestException('Cartão inválido ou recusado.');
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name: dto.name,
          passwordHash,
        },
      });
      const workspace = await tx.workspace.create({
        data: {
          name: dto.workspaceName,
          slug,
          memberships: {
            create: { userId: created.id, role: 'OWNER' },
          },
        },
      });
      await seedDefaultBoard(tx, workspace.id);
      await tx.subscription.create({
        data: {
          workspaceId: workspace.id,
          plan: 'TRIAL',
          status: 'TRIAL',
          trialEndsAt,
          stripeCustomerId,
        },
      });
      return created;
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(record.user.id, record.user.email);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        isSuperAdmin: true,
        memberships: {
          select: {
            role: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
                blockedAt: true,
                subscription: {
                  select: {
                    plan: true,
                    status: true,
                    trialEndsAt: true,
                    currentPeriodEnd: true,
                    blockedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueTokens(userId: string, email: string) {
    const payload: JwtPayload = { sub: userId, email };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.config.get<string>('JWT_ACCESS_TTL') ?? '15m') as unknown as number,
    });

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshHash = this.hashToken(refreshRaw);
    const ttlDays = this.parseDays(
      this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    );
    const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);

    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: refreshHash, expiresAt },
    });

    return { accessToken, refreshToken: refreshRaw };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseDays(ttl: string): number {
    const match = /^(\d+)d$/.exec(ttl);
    return match ? Number(match[1]) : 7;
  }
}
