import costridotLogo from '@/assets/costridot-logo.jpeg';
import foodwebbLogo from '@/assets/foodwebb-logo.jpeg';

export type BusinessId = 'costridot' | 'foodwebb';

export interface BusinessConfig {
  id: BusinessId;
  name: string;
  shortName: string;
  initials: string;
  tagline: string;
  senderName: string;
  logo: string;
  logoBackground: string;
  logoBorder: string;
  logoWidth: number;
  logoHeight: number;
  logoFit: 'cover' | 'contain';
  logoBorderRadius: number;
  filePrefix: string;
  billToLabel: string;
  itemPlaceholder: string;
  typeLabels: { production: string; rental: string };
  terms: { production: string; rental: string };
  notes: { production: string; rental: string };
  smartInputPlaceholder: string;
}

const ACCOUNT = {
  accountName: 'Costridot International',
  bankName: 'Kuda Bank',
  accountNumber: '3003475464',
};

export const BUSINESS_ACCOUNT = ACCOUNT;

export const BUSINESSES: Record<BusinessId, BusinessConfig> = {
  costridot: {
    id: 'costridot',
    name: 'Costridot International',
    shortName: 'Costridot',
    initials: 'CD',
    tagline: 'Choir robes & garments',
    senderName: 'Olayinka O Fagbuaro',
    logo: costridotLogo,
    logoBackground: '#000000',
    logoBorder: 'none',
    logoWidth: 140,
    logoHeight: 140,
    logoFit: 'cover',
    logoBorderRadius: 8,
    filePrefix: 'Costridot_Invoice',
    billToLabel: 'Bill To (Church/Customer Name) *',
    itemPlaceholder: 'e.g., Choir robes',
    typeLabels: { production: 'Production', rental: 'Rental' },
    terms: {
      production:
        'A minimum of 80% upfront payment is required to book production timeline.\nBalance is to be paid upon notification of completion ( not later than forty eight (48) hours. Pick-up or delivery is to be handled by client.',
      rental: '100% payment into:',
    },
    notes: { production: '', rental: 'Pick-up or delivery is to be handled by client' },
    smartInputPlaceholder:
      'First Baptist Church needs 40 choir robes at 30k each.\nAlso 10 stoles for 5,000 each.\nDeposit: 500k\nPlus VAT',
  },
  foodwebb: {
    id: 'foodwebb',
    name: 'Foodwebb Catering Services',
    shortName: 'Foodwebb',
    initials: 'FW',
    tagline: 'Catering & events',
    senderName: 'Foodwebb Catering Services',
    logo: foodwebbLogo,
    logoBackground: '#ffffff',
    logoBorder: '1px solid #e0e0e0',
    logoWidth: 160,
    logoHeight: 140,
    logoFit: 'contain',
    logoBorderRadius: 8,
    filePrefix: 'Foodwebb_Invoice',
    billToLabel: 'Bill To (Client/Event Name) *',
    itemPlaceholder: 'e.g., Jollof rice (per plate)',
    typeLabels: { production: 'Catering', rental: 'Equipment Rental' },
    terms: {
      production:
        'A minimum of 80% upfront payment is required to confirm the order.\nBalance is to be paid not later than forty eight (48) hours before the agreed delivery or pick-up date.',
      rental: '100% payment into:',
    },
    notes: {
      production: '',
      rental: 'Pick-up or delivery of equipment is to be handled by client. Items must be returned in good condition.',
    },
    smartInputPlaceholder:
      'Adeyemi wedding, 200 plates of jollof rice at 5k each.\nAlso 100 small chops for 2,500 each.\nDeposit: 300k\nPlus VAT',
  },
};

export const getBusiness = (id?: BusinessId): BusinessConfig =>
  BUSINESSES[id ?? 'costridot'] ?? BUSINESSES.costridot;
