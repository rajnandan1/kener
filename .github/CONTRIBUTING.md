# Contributing to Kener

Thank you for considering contributing to our project! Here are some guidelines to help you get started.

---

## How to Contribute

1. Fork the repository and clone it locally.
2. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Make your changes and commit them:
   ```bash
   git commit -m 'Describe your changes'
   ```
4. Push your changes to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
5. Create a pull request to the `main` branch.


## Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env` file in the root of the project and add the following:
   ```bash
   cp .env.example .env
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Documentation

The documentation is available in the `docs` folder. You can view it by going to [http://localhost:3000/docs/home](http://localhost:3000/docs/home) in your browser.

## Where to Start

1. Check out the [roadmap items](https://kener.ing/docs/roadmap/)
2. Add language support by following the [i18n guide](https://kener.ing/docs/i18n/)