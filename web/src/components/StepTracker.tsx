interface StepTrackerProps {
  readonly connected: boolean;
  readonly joined: boolean;
  readonly proving: boolean;
  readonly proved: boolean;
}

const STEPS = ['Connect Lace', 'Choose a counter', 'Prove & submit', 'Confirmed on Preprod'] as const;

/** Shows where the user is in the wallet → counter → proof → confirmation flow. */
export function StepTracker({ connected, joined, proving, proved }: StepTrackerProps) {
  const done = [connected, joined, proved, proved];
  const current = proving ? 2 : done.indexOf(false);
  return (
    <ol className="steps" aria-label="Progress">
      {STEPS.map((label, index) => {
        const state = done[index] ? 'done' : index === current ? 'current' : 'todo';
        return (
          <li key={label} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="step-index" aria-hidden="true">{state === 'done' ? '✓' : index + 1}</span>
            <span>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
