import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  workspaceName!: string;

  /**
   * Stripe PaymentMethod id coletado pelo Stripe Elements no frontend.
   * Obrigatório em produção (trial exige cartão); opcional em dev sem Stripe.
   */
  @IsOptional()
  @IsString()
  stripePaymentMethodId?: string;
}
