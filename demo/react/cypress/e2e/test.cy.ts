/// <reference types="cypress" />

import { describe, it } from 'vitest';

describe('My First Test', () => {
  it('Visits the app root url', () => {
    cy.visit('/')
    cy.contains('#google-signin-existing-btn', 'Custom Sign-in Button')
  })
})