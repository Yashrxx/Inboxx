/**
 * Universal image asset paths.
 * Points directly to static assets in the root public/ directory.
 */
import homeHero from "../assets/home_hero.jpg";
import loginHero from "../assets/login_hero.jpg";
import signupHero from "../assets/signup_hero.jpg";

export const HOME_HERO_IMG = homeHero;
export const LOGIN_HERO_IMG = loginHero;
export const SIGNUP_HERO_IMG = signupHero;

export const IMAGE_FALLBACKS = {
  home: [homeHero],
  login: [loginHero],
  signup: [signupHero],
};

