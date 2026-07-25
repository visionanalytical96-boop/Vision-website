export function SocialLoginButtons() {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button type="button" className="btn-secondary" aria-label="Continue with Google">
        <span aria-hidden>🇬</span>
      </button>
      <button type="button" className="btn-secondary" aria-label="Continue with Apple">
        <span aria-hidden></span>
      </button>
      <button type="button" className="btn-secondary" aria-label="Continue with Facebook">
        <span aria-hidden>f</span>
      </button>
    </div>
  );
}
