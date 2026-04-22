# Champions Team Builder 🏆

A powerful, fully offline-capable desktop application for building and managing Pokémon teams. Specially tailored for custom formats, ROM hacks, and the "Pokémon Champions" format. Built with JavaScript, HTML/CSS, and Electron.

## ✨ Features

- **Full Offline Support:** All Pokémon animated sprites, items, abilities, and move data are bundled locally. You can build your teams without any internet connection.
- **Custom Mega Evolutions:** Built-in support for fan-made Megas (e.g., Mega Chimecho, Mega Milotic, Mega Lapras) alongside all official forms.
- **Advanced Editor:** Instantly calculate stats based on Base Stats, IVs, EVs, and Natures.
- **Detailed Descriptions:** Real-time, accurate in-game descriptions for all Pokémon abilities and moves using a custom mini-card UI.
- **Cross-Platform:** Compiles standalone installers for Windows (`.exe`), macOS (`.dmg`), and Linux (`.AppImage`).

## 🚀 How to Run Locally (Development)

Make sure you have [Node.js](https://nodejs.org/) installed on your computer.

1. Clone or download this repository.
2. Open a terminal in the project folder.
3. Install the dependencies:
   ```bash
   npm install
   ```
4. Start the app:
   ```bash
   npm start
   ```

## 📦 How to Build (Create Installers)

You can generate standalone executables for your operating system using `electron-builder`.

**To build for Windows (run this from a Windows PC):**
```bash
npm run build:win
```

**To build for all platforms:**
```bash
npm run build:all
```

> **Note on macOS and Linux builds:** 
> To build a `.dmg` for macOS without owning a Mac, simply push your code to GitHub. This repository includes a GitHub Actions workflow (`.github/workflows/build.yml`) that will automatically compile and publish the Windows, macOS, and Linux installers in the **Releases** tab every time you push to the `main` branch.

## 👨‍💻 Author

Created by **Rukendark**.

## ⚖️ License & Legal Disclaimer

**License:** 
This project's source code is licensed under the MIT License.

**Legal Disclaimer:**
*This is a strictly non-commercial, fan-made open source project. Pokémon images, animated sprites, names, and related media are the intellectual property of The Pokémon Company, Game Freak, and Nintendo. This project is not affiliated with, sponsored by, or endorsed by them in any way. All rights to the original assets and properties belong to their respective corporate owners. No copyright infringement is intended.*