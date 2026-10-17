import { NotFoundException } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

describe('AssessmentsService ownership', () => {
  it('AssessmentsService.findOne rejects foreign assessments', async () => {
    const prisma = {
      assessment: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new AssessmentsService(prisma as never);
    await expect(service.findOne('a1', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.assessment.findFirst).toHaveBeenCalledWith({
      where: { id: 'a1', userId: 'user-1' },
    });
  });
});
