import Route from '@ember/routing/route';

export default class IndexRoute extends Route {

  async model() {

  (function playAll() {
    function kick() {
        document.querySelectorAll('video').forEach(v => {
          // flip muted off if you want sound right away
          // v.muted = false;
          v.play().catch(() => {});         // ignore promise failures
        });
      }
      kick();
      // keep watching for videos added later (infinite scroll, ads, etc.)
    })();

  }



}
