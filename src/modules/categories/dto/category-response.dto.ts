import { LocalizedTextDto } from '@/common/dto/localized-text.dto';

export class CategoryResponseDto {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class CategoryDashboardResponseDto {
  id: string;
  name: LocalizedTextDto;
  description?: LocalizedTextDto | null;
  createdAt: Date;
  updatedAt: Date;
}
