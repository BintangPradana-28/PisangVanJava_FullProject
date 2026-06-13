/**
 * RAG Source:
 * - c:\Users\prada\Downloads\PisangVanJava_FullProject\pisang-van-java\components\user\Navbar.tsx
 * - c:\Users\prada\Downloads\PisangVanJava_FullProject\pisang-van-java\components\user\MenuGrid.tsx
 * - c:\Users\prada\Downloads\PisangVanJava_FullProject\pisang-van-java\components\user\QuickViewModal.tsx
 */

/**
 * Animates a 3D-feeling parabolic arc of a banana emoji from a clicked item directly into the active cart element.
 * Splits horizontal motion (linear) and vertical motion (bezier with overshoot) to produce a realistic arc.
 */
export function animateFlyToCart(fromElement: HTMLElement) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  // Identify active cart targets in order of priority: floating bottom bar, desktop floating button, header cart
  const target =
    document.querySelector('#floating-cart') ||
    document.querySelector('#floating-cart-empty') ||
    document.querySelector('#navbar-cart')

  if (!target) return

  const rectStart = fromElement.getBoundingClientRect()
  const rectEnd = target.getBoundingClientRect()

  const startX = rectStart.left + rectStart.width / 2
  const startY = rectStart.top + rectStart.height / 2
  const endX = rectEnd.left + rectEnd.width / 2
  const endY = rectEnd.top + rectEnd.height / 2

  // Create outer wrapper for linear horizontal translation
  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '0'
  wrapper.style.top = '0'
  wrapper.style.zIndex = '9999'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.transition = 'transform 0.6s linear'
  wrapper.style.transform = `translate3d(${startX}px, ${startY}px, 0)`

  // Create inner div for parabolic vertical curve (height peak) and scaling/rotation
  const inner = document.createElement('div')
  inner.innerText = '🍌'
  inner.style.fontSize = '24px'
  inner.style.transition = 'transform 0.6s cubic-bezier(0.06, 0.97, 0.5, 1.2)'
  inner.style.transform = 'translate3d(-50%, -50%, 0) scale(1)'

  wrapper.appendChild(inner)
  document.body.appendChild(wrapper)

  // Force layout reflow
  void wrapper.offsetWidth

  // Execute coordinates transformation
  wrapper.style.transform = `translate3d(${endX}px, ${startY}px, 0)`
  inner.style.transform = `translate3d(-50%, calc(-50% + ${endY - startY}px), 0) scale(0.15) rotate(540deg)`

  setTimeout(() => {
    wrapper.remove()
    // Trigger pop bounce feedback on target element
    target.classList.add('scale-pop')
    setTimeout(() => target.classList.remove('scale-pop'), 250)
  }, 600)
}

/**
 * Animates a 3D-feeling heart fly animation from a favorited item directly into the profile avatar section.
 */
export function animateFlyHeart(fromElement: HTMLElement) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const target =
    document.querySelector('#navbar-profile') || document.querySelector('#navbar-login')

  if (!target) return

  const rectStart = fromElement.getBoundingClientRect()
  const rectEnd = target.getBoundingClientRect()

  const startX = rectStart.left + rectStart.width / 2
  const startY = rectStart.top + rectStart.height / 2
  const endX = rectEnd.left + rectEnd.width / 2
  const endY = rectEnd.top + rectEnd.height / 2

  const wrapper = document.createElement('div')
  wrapper.style.position = 'fixed'
  wrapper.style.left = '0'
  wrapper.style.top = '0'
  wrapper.style.zIndex = '9999'
  wrapper.style.pointerEvents = 'none'
  wrapper.style.transition = 'transform 0.6s linear'
  wrapper.style.transform = `translate3d(${startX}px, ${startY}px, 0)`

  const inner = document.createElement('div')
  inner.innerText = '❤️'
  inner.style.fontSize = '20px'
  inner.style.transition = 'transform 0.6s cubic-bezier(0.06, 0.97, 0.5, 1.2)'
  inner.style.transform = 'translate3d(-50%, -50%, 0) scale(1)'

  wrapper.appendChild(inner)
  document.body.appendChild(wrapper)

  // Force layout reflow
  void wrapper.offsetWidth

  // Execute coordinates transformation
  wrapper.style.transform = `translate3d(${endX}px, ${startY}px, 0)`
  inner.style.transform = `translate3d(-50%, calc(-50% + ${endY - startY}px), 0) scale(0.15) rotate(360deg)`

  setTimeout(() => {
    wrapper.remove()
    // Trigger pop bounce feedback on target element
    target.classList.add('scale-pop')
    setTimeout(() => target.classList.remove('scale-pop'), 250)
  }, 600)
}
