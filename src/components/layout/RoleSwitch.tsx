import { useTranslation } from 'react-i18next';
import { UserRound, Store } from 'lucide-react';
import { useUiStore } from '../../store/ui';
import { SegmentedControl } from '../ui/Controls';

export function RoleSwitch({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const { t } = useTranslation();
  const role = useUiStore((state) => state.role);
  const setRole = useUiStore((state) => state.setRole);
  return (
    <SegmentedControl
      size={size}
      value={role}
      onChange={setRole}
      ariaLabel={t('aria.switchRole')}
      options={[
        { value: 'customer', label: t('roles.customer'), icon: <UserRound className="h-3.5 w-3.5" aria-hidden /> },
        { value: 'owner', label: t('roles.owner'), icon: <Store className="h-3.5 w-3.5" aria-hidden /> },
      ]}
    />
  );
}
