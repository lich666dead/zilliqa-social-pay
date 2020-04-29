import { v4 as uuidv4 } from 'uuid';
import { createDomain } from 'effector';
import { NotificationState } from 'interfaces';

export const EventDomain = createDomain();
export const addNotifly = EventDomain.event<JSX.Element>();
export const rmNotifly = EventDomain.event<string>();

const initalState = {
  notifications: [],
  timeoutTransition: 400,
  timeoutNotifications: 5000
};

export const store = EventDomain.store<NotificationState>(initalState)
  .on(addNotifly, (state, component) => {
    const { notifications } = state;
    const notification = {
      element: component,
      uuid: uuidv4()
    };

    notifications.push(notification);

    setTimeout(
      () => rmNotifly(notification.uuid),
      state.timeoutNotifications
    );

    return {
      ...state,
      notifications
    };
  })
  .on(rmNotifly, (state, uuid) => ({
    ...state,
    notifications: state.notifications.filter(
      (el) => el.uuid !== uuid
    )
  }));

export default {
  store,
  addNotifly,
  rmNotifly
};
