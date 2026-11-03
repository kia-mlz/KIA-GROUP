import { describe, expect, it } from 'vitest';
import { HOME_PATH, resolveInternalNext, resolvePostLoginPath } from './postLoginPath';

describe('resolveInternalNext', () => {
  it('defaults to the departments page when there is no deep link', () => {
    expect(resolveInternalNext(null)).toBe(HOME_PATH);
    expect(resolveInternalNext(undefined)).toBe(HOME_PATH);
    expect(resolveInternalNext('')).toBe(HOME_PATH);
    expect(resolveInternalNext('   ')).toBe(HOME_PATH);
  });

  it('honors an internal deep link', () => {
    expect(resolveInternalNext('/roadmap')).toBe('/roadmap');
    expect(resolveInternalNext('/education?next=%2Fcheckout')).toBe('/education?next=%2Fcheckout');
  });

  it('folds the landing page and the login screen into HOME_PATH', () => {
    expect(resolveInternalNext('/')).toBe(HOME_PATH);
    expect(resolveInternalNext('/login')).toBe(HOME_PATH);
    expect(resolveInternalNext('/login?next=%2Fadmin')).toBe(HOME_PATH);
  });

  it('rejects off-site values (open redirects)', () => {
    expect(resolveInternalNext('//evil.example')).toBe(HOME_PATH);
    expect(resolveInternalNext('https://evil.example')).toBe(HOME_PATH);
    expect(resolveInternalNext('javascript:alert(1)')).toBe(HOME_PATH);
    expect(resolveInternalNext('/\\evil.example')).toBe(HOME_PATH);
    expect(resolveInternalNext('/education://evil.example')).toBe(HOME_PATH);
    expect(resolveInternalNext('/roadmap\u0000evil')).toBe(HOME_PATH);
  });
});

describe('resolvePostLoginPath', () => {
  it('sends staff to admin by default', () => {
    expect(resolvePostLoginPath('SUPER_ADMIN', null)).toBe('/admin');
    expect(resolvePostLoginPath('ADMIN', '/dashboard')).toBe('/admin');
  });

  it('treats custom (non-learner) roles as staff (ADM-1)', () => {
    expect(resolvePostLoginPath('support-agent', null)).toBe('/admin');
    expect(resolvePostLoginPath('support-agent', '/admin/tickets')).toBe('/admin/tickets');
  });

  it('honors admin next paths for staff', () => {
    expect(resolvePostLoginPath('ADMIN', '/admin/users')).toBe('/admin/users');
  });

  it('never sends learners to /admin (breaks redirect loops)', () => {
    expect(resolvePostLoginPath('LEARNER', '/admin')).toBe(HOME_PATH);
    expect(resolvePostLoginPath('LEARNER', '/admin/users')).toBe(HOME_PATH);
  });

  it('lands learners on the three-door home page', () => {
    expect(resolvePostLoginPath('LEARNER', null)).toBe(HOME_PATH);
    expect(resolvePostLoginPath('LEARNER', undefined)).toBe(HOME_PATH);
    expect(resolvePostLoginPath('LEARNER', '/')).toBe(HOME_PATH);
  });

  it('still honors learner deep links', () => {
    expect(resolvePostLoginPath('LEARNER', '/roadmap')).toBe('/roadmap');
    expect(resolvePostLoginPath('LEARNER', '/courses')).toBe('/courses');
  });

  it('rejects open redirects', () => {
    expect(resolvePostLoginPath('LEARNER', '//evil.example')).toBe(HOME_PATH);
    expect(resolvePostLoginPath('LEARNER', 'https://evil.example')).toBe(HOME_PATH);
  });
});