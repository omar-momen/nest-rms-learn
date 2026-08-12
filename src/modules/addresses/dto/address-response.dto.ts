export class AddressResponseDto {
  id: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
  latitude: number;
  longitude: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}
