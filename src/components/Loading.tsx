import Logo from '../assets/images/logo.svg?react';

const Loading = () => {
  return (
    <section className="loader">
      <svg viewBox="0 0 300 300" width={140}>
        <defs>
          <pattern
            id="lines"
            width="50"
            height="40"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          ></pattern>

          <mask id="fillMask">
            <rect width="600" height="600" fill="url(#lines)">
              <animateTransform
                attributeName="transform"
                type="translate"
                from="-300 0"
                to="300 0"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </rect>
          </mask>
        </defs>

        <Logo opacity={0.25} />

        <g mask="url(#fillMask)">
          <Logo />
        </g>
      </svg>
    </section>
  );
};

export default Loading;
