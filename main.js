// Minimal client-side bootstrap for GitHub Pages
// This intentionally avoids TypeScript/Angular dependencies so the page can render without a build step.
const root = document.querySelector('app-root');
if (root) {
  root.innerHTML = `
    <div class="max-w-3xl mx-auto p-8">
      <h1 class="text-3xl font-extrabold mb-4">Prompt Engineering Coach</h1>
      <p class="text-gray-600 mb-6">Welcome — this is a lightweight client-side bootstrap so the site shows content while the Angular app is built & deployed.</p>
      <div class="bg-white shadow rounded p-6">
        <p class="text-gray-700">Your full app is not yet bootstrapped on the Pages site because the TypeScript/Angular sources require a build step. To restore the full app, add a build-and-deploy workflow that runs <code>npm ci</code> and <code>npm run build</code> and publishes the output to Pages.</p>
        <hr class="my-4" />
        <ul class="list-disc pl-5 text-gray-700">
          <li>If you want this repo to serve the built app directly, commit the build output (e.g., the dist folder) to the branch or use the Pages-files deployment in Actions.</li>
          <li>Alternatively, the workflow included below will build and publish the generated site automatically on pushes to main.</li>
        </ul>
      </div>
    </div>
  `;
} else {
  console.warn('app-root element not found.');
}
