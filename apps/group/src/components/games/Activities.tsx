'use client';

import { useEffect, useMemo, useState } from 'react';
import type { LearnerGameStage } from '@kia./shared';
import { SandboxPreview } from './SandboxPreview';
import { uiForType } from './games-copy';

type Props = {
  stage: LearnerGameStage;
  gameType: string;
  answer: unknown;
  onChange: (answer: unknown) => void;
  disabled?: boolean;
  pythonNote: string;
  runLabel: string;
  resetLabel: string;
  previewLabel: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function list(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === 'object') as Array<Record<string, unknown>> : [];
}

export function GameActivity(props: Props) {
  const ui = String(props.stage.challengeConfig.ui ?? uiForType(props.gameType));
  if (ui === 'quiz') return <Quiz {...props} />;
  if (ui === 'drag') return <Drag {...props} />;
  if (ui === 'match') return <Match {...props} />;
  if (ui === 'blanks') return <Blanks {...props} />;
  if (ui === 'output') return <Output {...props} />;
  if (ui === 'blocks') return <Blocks {...props} />;
  if (ui === 'sim') return <Sim {...props} />;
  if (ui === 'bug' || ui === 'code' || ui === 'website') return <Code {...props} ui={ui} />;
  return <TextAnswer {...props} />;
}

function Quiz({ stage, answer, onChange, disabled }: Props) {
  const options = list(stage.challengeConfig.options);
  const selected = String(record(answer).selected ?? '');
  const prompt = String(stage.challengeConfig.prompt ?? stage.mission);
  return (
    <fieldset className="eg-choice" disabled={disabled}>
      <legend>{prompt}</legend>
      {options.map((option) => {
        const id = String(option.id);
        return (
          <label key={id} className={selected === id ? 'is-on' : ''}>
            <input
              type="radio"
              name={stage.id}
              checked={selected === id}
              onChange={() => onChange({ selected: [id] })}
            />
            <span>{String(option.text ?? option.label ?? id)}</span>
          </label>
        );
      })}
    </fieldset>
  );
}

function Drag({ stage, answer, onChange, disabled }: Props) {
  const items = list(stage.challengeConfig.items);
  const slots = list(stage.challengeConfig.slots);
  const placements = record(record(answer).placements);
  const [picked, setPicked] = useState('');
  return (
    <div className="eg-drag">
      <div className="eg-chip-row">
        {items.map((item) => {
          const id = String(item.id);
          return (
            <button
              key={id}
              type="button"
              className={picked === id ? 'is-on' : ''}
              disabled={disabled}
              onClick={() => setPicked(id)}
            >
              {String(item.label ?? id)}
            </button>
          );
        })}
      </div>
      <div className="eg-slots">
        {slots.map((slot) => {
          const id = String(slot.id);
          const placed = String(placements[id] ?? '');
          const label = items.find((item) => String(item.id) === placed);
          return (
            <button
              key={id}
              type="button"
              className="eg-slot"
              disabled={disabled}
              onClick={() => {
                if (!picked) return;
                onChange({ placements: { ...placements, [id]: picked } });
                setPicked('');
              }}
            >
              <small>{String(slot.label ?? id)}</small>
              <strong>{label ? String(label.label) : '—'}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Match({ stage, answer, onChange, disabled }: Props) {
  const left = list(stage.challengeConfig.left);
  const right = list(stage.challengeConfig.right);
  const pairs = record(record(answer).pairs);
  return (
    <div className="eg-match">
      {left.map((item) => {
        const id = String(item.id);
        return (
          <label key={id}>
            <span>{String(item.label ?? id)}</span>
            <select
              disabled={disabled}
              value={String(pairs[id] ?? '')}
              onChange={(event) => onChange({ pairs: { ...pairs, [id]: event.target.value } })}
            >
              <option value="">—</option>
              {right.map((option) => (
                <option key={String(option.id)} value={String(option.id)}>
                  {String(option.label ?? option.id)}
                </option>
              ))}
            </select>
          </label>
        );
      })}
    </div>
  );
}

function Blanks({ stage, answer, onChange, disabled }: Props) {
  const template = String(stage.challengeConfig.template ?? '');
  const ids = Array.isArray(stage.challengeConfig.blankIds)
    ? (stage.challengeConfig.blankIds as unknown[]).map(String)
    : [];
  const blanks = record(record(answer).blanks);
  const parts = template.split('___');
  return (
    <p className="eg-blanks" dir="ltr">
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {part}
          {index < ids.length ? (
            <input
              disabled={disabled}
              value={String(blanks[ids[index]] ?? '')}
              aria-label={ids[index]}
              onChange={(event) =>
                onChange({ blanks: { ...blanks, [ids[index]]: event.target.value } })
              }
            />
          ) : null}
        </span>
      ))}
    </p>
  );
}

function Output({ stage, answer, onChange, disabled }: Props) {
  return (
    <div className="eg-code-layout">
      <pre className="eg-code" dir="ltr">{String(stage.challengeConfig.code ?? '')}</pre>
      <label className="eg-field">
        <span>خروجی</span>
        <input
          dir="ltr"
          disabled={disabled}
          value={String(record(answer).value ?? '')}
          onChange={(event) => onChange({ value: event.target.value })}
        />
      </label>
    </div>
  );
}

function Blocks({ stage, answer, onChange, disabled }: Props) {
  const blocks = list(stage.challengeConfig.blocks);
  const initial = blocks.map((block) => String(block.id));
  const order = Array.isArray(record(answer).order) ? (record(answer).order as unknown[]).map(String) : initial;
  const byId = useMemo(() => new Map(blocks.map((block) => [String(block.id), block])), [blocks]);
  useEffect(() => {
    if (!record(answer).order) onChange({ order: initial });
  }, [stage.id]);
  const move = (index: number, dir: number) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item);
    onChange({ order: next });
  };
  return (
    <ol className="eg-blocks">
      {order.map((id, index) => (
        <li key={id}>
          <code dir="ltr">{String(byId.get(id)?.code ?? id)}</code>
          <span>
            <button type="button" disabled={disabled} onClick={() => move(index, -1)}>↑</button>
            <button type="button" disabled={disabled} onClick={() => move(index, 1)}>↓</button>
          </span>
        </li>
      ))}
    </ol>
  );
}

function Sim({ stage, answer, onChange, disabled }: Props) {
  const steps = list(stage.challengeConfig.steps);
  const choices = record(record(answer).choices);
  return (
    <div className="eg-sim">
      {steps.map((step) => {
        const id = String(step.id);
        const options = list(step.choices);
        return (
          <fieldset key={id} disabled={disabled}>
            <legend>{String(step.prompt ?? '')}</legend>
            {options.map((option) => {
              const optionId = String(option.id);
              return (
                <label key={optionId} className={choices[id] === optionId ? 'is-on' : ''}>
                  <input
                    type="radio"
                    name={id}
                    checked={choices[id] === optionId}
                    onChange={() => onChange({ choices: { ...choices, [id]: optionId } })}
                  />
                  <span>{String(option.label ?? optionId)}</span>
                </label>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}

function Code({
  stage,
  answer,
  onChange,
  disabled,
  ui,
  pythonNote,
  runLabel,
  resetLabel,
  previewLabel,
}: Props & { ui: string }) {
  const language = String(stage.challengeConfig.language ?? 'html');
  const starter = String(stage.challengeConfig.starter ?? stage.challengeConfig.buggyCode ?? stage.challengeConfig.code ?? '');
  const code = String(record(answer).code ?? starter);
  const [show, setShow] = useState(false);
  const python = language === 'python';
  return (
    <div className="eg-code-layout">
      <p className="eg-prompt">{String(stage.challengeConfig.prompt ?? stage.mission)}</p>
      <textarea
        className="eg-code"
        dir="ltr"
        spellCheck={false}
        disabled={disabled}
        value={code}
        onChange={(event) => onChange({ code: event.target.value })}
      />
      <div className="eg-row">
        <button type="button" className="pill-btn" disabled={python} onClick={() => setShow(true)}>
          {runLabel}
        </button>
        <button
          type="button"
          className="pill-btn"
          disabled={disabled}
          onClick={() => onChange({ code: starter })}
        >
          {resetLabel}
        </button>
        <span className="eg-lang">{language}</span>
      </div>
      {python ? <p className="muted">{pythonNote}</p> : null}
      {show && !python ? (
        <div>
          <p className="eg-kicker">{previewLabel}</p>
          <SandboxPreview
            mode={ui === 'website' || language === 'html' || language === 'css' ? 'page' : 'script'}
            html={language === 'html' || ui === 'website' ? code : String(stage.challengeConfig.html ?? '')}
            css={language === 'css' ? code : ''}
            js={language === 'javascript' ? code : ''}
          />
        </div>
      ) : null}
    </div>
  );
}

function TextAnswer({ answer, onChange, disabled }: Props) {
  return (
    <textarea
      className="eg-code"
      disabled={disabled}
      value={String(record(answer).value ?? '')}
      onChange={(event) => onChange({ value: event.target.value })}
    />
  );
}
