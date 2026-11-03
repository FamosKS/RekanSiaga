import { Link, type LinkProps } from 'react-router-dom'
import { buttonStyles, type ButtonSize, type ButtonVariant } from './buttonStyles'
type LinkButtonProps = LinkProps & { variant?: ButtonVariant; size?: ButtonSize }
export function LinkButton({ variant = 'primary', size = 'md', className, ...props }: LinkButtonProps) {
  return <Link {...props} className={buttonStyles(variant, size, className)}/>
}
