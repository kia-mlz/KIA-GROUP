import { sanitizeChallenge, toLearnerStage } from './educational-games.presenter';

describe('learner game payloads', () => {
  it('strips answer keys from challenge config', () => {
    const clean = sanitizeChallenge({
      ui: 'quiz',
      prompt: 'عنوان؟',
      options: [
        { id: 'h1', text: 'h1', correct: true },
        { id: 'p', text: 'p', correct: false },
      ],
      correctIds: ['SECRET_SENTINEL'],
      order: ['SECRET_SENTINEL'],
      pairs: { a: 'SECRET_SENTINEL' },
    });
    const encoded = JSON.stringify(clean);
    expect(encoded).not.toContain('SECRET_SENTINEL');
    expect(encoded).not.toContain('correct');
    expect(clean.ui).toBe('quiz');
  });

  it('does not copy grading config onto a learner stage', () => {
    const stage = toLearnerStage({
      id: 's1',
      title: 'سؤال',
      description: '',
      mission: 'یکی را انتخاب کن',
      sortOrder: 0,
      challengeType: 'mcq',
      challengeConfig: { ui: 'quiz', options: [{ id: 'a', text: 'الف' }], correctIds: ['SECRET_SENTINEL'] },
      hints: ['راهنما'],
      points: 10,
      timeLimitSec: null,
    });
    expect(JSON.stringify(stage)).not.toContain('SECRET_SENTINEL');
    expect(stage).not.toHaveProperty('gradingConfig');
    expect(stage.hintsAvailable).toBe(1);
  });
});
