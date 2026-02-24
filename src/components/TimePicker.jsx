import { useRef } from 'react';

export default function TimePicker({ value, onChange }) {
  const [h, m] = (value || '12:00').split(':');
  const digits = [h[0] || '1', h[1] || '2', m[0] || '0', m[1] || '0'];
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const focusDigit = (index) => {
    if (refs[index]?.current) {
      refs[index].current.focus();
      refs[index].current.select();
    }
  };

  const handleDigit = (index, digit) => {
    const d = Number(digit);
    if (isNaN(d)) return;

    const newDigits = [...digits];

    // Validate digit based on position
    if (index === 0 && d > 2) return;
    if (index === 1 && newDigits[0] === '2' && d > 3) return;
    if (index === 2 && d > 5) return;

    newDigits[index] = String(d);

    // Fix h1 if h0 changed to 2 and h1 > 3
    if (index === 0 && d === 2 && Number(newDigits[1]) > 3) {
      newDigits[1] = '3';
    }

    const newH = newDigits[0] + newDigits[1];
    const newM = newDigits[2] + newDigits[3];
    onChange(`${newH}:${newM}`);

    // Auto-advance to next digit
    if (index < 3) {
      setTimeout(() => focusDigit(index + 1), 0);
    } else {
      refs[index].current?.blur();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      newDigits[index] = '0';
      const newH = newDigits[0] + newDigits[1];
      const newM = newDigits[2] + newDigits[3];
      onChange(`${newH}:${newM}`);
      if (index > 0) {
        setTimeout(() => focusDigit(index - 1), 0);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      focusDigit(index - 1);
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      focusDigit(index + 1);
    } else if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleDigit(index, e.key);
    } else if (e.key !== 'Tab') {
      e.preventDefault();
    }
  };

  const handleInput = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    if (val.length > 0) {
      handleDigit(index, val[val.length - 1]);
    }
  };

  return (
    <div className="time-input">
      <div className="time-input-fields">
        {digits.map((digit, i) => (
          <span key={i} className="time-input-group">
            <input
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              className="time-digit"
              value={digit}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onInput={(e) => handleInput(i, e)}
              onFocus={(e) => e.target.select()}
              onClick={(e) => e.target.select()}
              readOnly={false}
              autoComplete="off"
            />
            {i === 1 && <span className="time-input-sep">:</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
