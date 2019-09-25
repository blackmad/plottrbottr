import Vue from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify';

Vue.config.productionTip = false;

// @ts-ignore
new Vue({
  // @ts-ignore
  vuetify,
  render: (h) => h(App)
}).$mount('#app');
