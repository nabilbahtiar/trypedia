export interface RentalPurchaseSummary {
  orderId: string;
  productTitle: string;
  productImage: string | null;
  buyPrice: number;
  rentPaid: number;
  remaining: number;
  serviceFee: number;
  totalDue: number;
  balance: number;
  status: string;
  paymentStatus: string | null;
  paymentMethod: string | null;
  proofUrl: string | null;
  rejectionReason?: string | null;
}
