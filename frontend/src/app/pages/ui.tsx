import { Button } from '@shared/ui/Button';
import { ButtonIcon } from '@shared/ui/Button/ButtonIcon';
import { Icon } from '@shared/ui/Icon';

export function UIElements() {
  return (
    <section className="m-3 flex items-center justify-center gap-3">
		<ButtonIcon icon='close' variant='muted'/>
		<Button theme='outline' variant='danger'>
			<Icon name='login'></Icon>
			Login
		</Button>
    </section>
  );
}
