import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';

import { CreateBranchDto, UpdateBranchDto, BranchResponseDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateBranchDto): Promise<BranchResponseDto> {
    return this.prisma.branch.create({ data });
  }

  findAll(): Promise<BranchResponseDto[]> {
    return this.prisma.branch.findMany();
  }

  async findOne(id: string): Promise<BranchResponseDto> {
    const branch = await this.prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      throw new NotFoundException('errors.branch_not_found');
    }
    return branch;
  }

  async update(id: string, data: UpdateBranchDto): Promise<BranchResponseDto> {
    await this.findOne(id);
    return this.prisma.branch.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    await this.findOne(id);

    const orderCount = await this.prisma.order.count({
      where: { branchId: id },
    });
    if (orderCount > 0) {
      throw new BadRequestException(
        'errors.cannot_delete_branch_with_orders',
      );
    }

    await this.prisma.branch.delete({ where: { id } });
    return { message: 'success.branch_deleted' };
  }
}
