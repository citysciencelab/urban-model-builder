import type Store from '@ember-data/store';
import Service from '@ember/service';
import { inject as service } from '@ember/service';

export default class UserService extends Service {
  @service declare session: any;
  @service declare store: Store;

  get currentUserId() {
    if (this.session?.data?.authenticated?.userinfo?.id) {
      return `${this.session.data.authenticated.userinfo.id}`;
    }
    return null;
  }
}
