export function Logo({ size = 32 }) {
  return (
    <span className="logo">
      <img src="/favicon.svg" width={size} height={size} alt="" aria-hidden="true" />
      <span className="logo__text">nassau<strong>Tickets</strong></span>
    </span>
  );
}
