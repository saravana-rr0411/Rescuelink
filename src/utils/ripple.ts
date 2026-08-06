import React from 'react';

/**
 * Creates a Material Design ripple animation originating from the click/tap position.
 * @param event MouseEvent or TouchEvent
 */
export function createRipple(event: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) {
  const button = event.currentTarget;

  const rect = button.getBoundingClientRect();
  let clientX = 0;
  let clientY = 0;

  if ('touches' in event && event.touches.length > 0) {
    clientX = event.touches[0].clientX;
    clientY = event.touches[0].clientY;
  } else if ('clientX' in event) {
    clientX = (event as React.MouseEvent<HTMLElement>).clientX;
    clientY = (event as React.MouseEvent<HTMLElement>).clientY;
  } else {
    clientX = rect.left + rect.width / 2;
    clientY = rect.top + rect.height / 2;
  }

  const diameter = Math.max(rect.width, rect.height);
  const radius = diameter / 2;

  const circle = document.createElement('span');
  circle.className = 'ripple-circle';
  circle.style.width = `${diameter}px`;
  circle.style.height = `${diameter}px`;
  circle.style.left = `${clientX - rect.left - radius}px`;
  circle.style.top = `${clientY - rect.top - radius}px`;

  // Make sure container has relative position and overflow hidden
  if (!button.classList.contains('ripple-container')) {
    button.classList.add('ripple-container');
  }

  const existingRipple = button.getElementsByClassName('ripple-circle')[0];
  if (existingRipple) {
    existingRipple.remove();
  }

  button.appendChild(circle);

  setTimeout(() => {
    circle.remove();
  }, 600);
}
