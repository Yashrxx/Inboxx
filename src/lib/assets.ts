/**
 * Universal image asset paths.
 * Points directly to static assets in the root public/ directory.
 */
import homeHero from "../assets/images/workspace_hero_bg_1787032051238.jpg";
import loginHero from "../assets/images/office_hero_login_1787028506237.jpg";
import signupHero from "../assets/images/office_team_signup_1787029114301.jpg";

export const HOME_HERO_IMG = homeHero;
export const LOGIN_HERO_IMG = loginHero;
export const SIGNUP_HERO_IMG = signupHero;

export const IMAGE_FALLBACKS = {
  home: [homeHero, "/home_hero.jpg", "/images/home_hero.jpg"],
  login: [loginHero, "/login_hero.jpg", "/images/login_hero.jpg"],
  signup: [signupHero, "/signup_hero.jpg", "/images/signup_hero.jpg"],
};
