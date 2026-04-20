import Stripe = require('stripe');

export type StripeClient = InstanceType<typeof Stripe>;

type Webhooks = StripeClient['webhooks'];
export type StripeEvent = ReturnType<Webhooks['constructEvent']>;

type Subs = StripeClient['subscriptions'];
type SubRetrieve = Awaited<ReturnType<Subs['retrieve']>>;
export type StripeSubscription = SubRetrieve;

type Invoices = StripeClient['invoices'];
export type StripeInvoice = Awaited<ReturnType<Invoices['retrieve']>>;

type Sessions = StripeClient['checkout']['sessions'];
export type StripeCheckoutSession = Awaited<ReturnType<Sessions['retrieve']>>;
