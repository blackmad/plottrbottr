import Vue from 'vue';
import App from './App.vue';

Vue.config.productionTip = false;

import 'paper';

new Vue({
  render: h => h(App),
}).$mount('#app');
