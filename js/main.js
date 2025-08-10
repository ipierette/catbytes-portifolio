// js/main.js
import { initUI } from './modules/ui.js';
import { initScrollAnimations, initCatPopup } from './modules/animations.js';
import { initProjectsGallery } from './modules/projectsGallery.js';
import { initSkillsCarousel } from './modules/skillsCarousel.js';

import { initIATabs } from './modules/iaTabs.js';
import { initAdoptCat } from './modules/adoptCat.js';
import { initGenerateAd } from './modules/generateAd.js';
import { initIdentifyCat } from './modules/identifyCat.js';
import { initLazyLoad } from './modules/lazyLoad.js';

document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initScrollAnimations();
  initCatPopup();
  initProjectsGallery();
  initSkillsCarousel();

  initIATabs();
  initAdoptCat();
  initGenerateAd();
  initIdentifyCat();

  initLazyLoad();
});
