interface LogoProps {
  size?: number
  variant?: 'dark' | 'white'
  className?: string
}

export function Logo({ size = 32, variant = 'dark', className }: LogoProps) {
  const fg = variant === 'white' ? '#ffffff' : '#010b15'
  const border = variant === 'white' ? '#ffffff' : '#010b15'

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 227.77 227.77"
      width={size}
      height={size}
      className={className}
    >
      <rect fill="none" stroke={border} strokeMiterlimit="10" x=".5" y=".5" width="226.77" height="226.77" rx="14.17" ry="14.17"/>
      <rect fill="#045dcc" x="174.91" y="54.15" width="19.81" height="18.98"/>
      <path fill={fg} d="M175.06,80.38l19.66.03v92.68s-19.69,0-19.69,0l-.04-46.32-26.69.14c-5.15,22.66-22.03,40.45-44.7,45.37-22.47,4.88-44.96-3.98-58.62-22.28-20.32-27.22-14.12-66.09,14.03-85.45,15.63-10.75,34.9-13.58,54.19-6.01,14.27,5.59,27.88,18.79,32.79,36.2l-18.77-.02c-9.66-19.92-32.74-27.97-52.85-18.5-15.06,7.09-24.28,22.52-23.77,38.97.5,16.14,10.23,31.17,25.58,37.49,12.34,5.08,25.45,4.01,36.58-3.32,13.39-8.82,20.09-24.16,18.64-40.61l43.64-.09v-28.29Z"/>
    </svg>
  )
}
