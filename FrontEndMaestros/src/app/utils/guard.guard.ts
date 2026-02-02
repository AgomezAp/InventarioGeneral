import {
  CanDeactivateFn,
  Router,
} from '@angular/router';

import { GuardService } from '../services/guard.service';

export const guardGuard: CanDeactivateFn<unknown> = (component, currentRoute, currentState, nextState) => {
  const authGuard = new GuardService(new Router)

  return authGuard.desactivar();
};
