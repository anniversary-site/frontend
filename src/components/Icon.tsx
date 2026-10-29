const paths = {
  back: 'm15 18-6-6 6-6',
  next: 'm9 6 6 6-6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  copy: 'M9 9h11v11H9zM15 9V4H4v11h5',
  play: 'm8 5 11 7-11 7Z',
  external: 'M7 17 17 7M7 7h10v10',
}

type IconProps = { name: keyof typeof paths; small?: boolean; className?: string }

export default function Icon({ name, small = false, className = '' }: IconProps) {
  return (
    <svg
      className={`icon ${small ? 'icon-small' : ''} ${className}`}
      viewBox="0 0 24 24"
      width={small ? 20 : 24}
      height={small ? 20 : 24}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.arrow} />
    </svg>
  )
}
