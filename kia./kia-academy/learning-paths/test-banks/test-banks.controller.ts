import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TEST_BANK_IDS, type TestBankId } from '@kia./shared';
import { TestBanksService } from './test-banks.service';

/** Public learner endpoints — readiness answers stay server-only via exam start. */
@Controller('tests')
export class TestBanksController {
  constructor(private readonly testBanks: TestBanksService) {}

  @Get('personality')
  getPersonality() {
    return this.testBanks.getPersonalityBank();
  }

  @Get('assessment')
  getAssessment() {
    return this.testBanks.getAssessmentBank();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    if (!TEST_BANK_IDS.includes(id as TestBankId)) {
      throw new NotFoundException('Unknown test bank');
    }
    if (id === 'readiness') {
      // Never expose grading keys on the public route.
      const bank = await this.testBanks.getReadinessBank();
      return {
        version: bank.version,
        questions: bank.questions.map(({ answer: _answer, ...rest }) => rest),
      };
    }
    return this.testBanks.getBank(id as TestBankId).then((p) => p.bank);
  }
}
