// GitHub Release / Update Detection Engine for x75
import packageJson from '../../package.json';

const CURRENT_VERSION = packageJson.version || '1.0.0';
const GITHUB_REPO = 'xengoski/x75';
const STORAGE_DISMISSED_KEY = 'X75_DISMISSED_UPDATE_V1';
const STORAGE_LAST_CHECK_KEY = 'X75_LAST_UPDATE_CHECK_V1';

// Checks GitHub for updates (only once every 4 hours max to be courteous and rate-limit safe)
export const checkForGitHubUpdates = async (force = false) => {
  try {
    const lastCheck = localStorage.getItem(STORAGE_LAST_CHECK_KEY);
    const now = Date.now();

    // Skip if checked in the last 4 hours unless forced
    if (!force && lastCheck && now - parseInt(lastCheck, 10) < 4 * 60 * 60 * 1000) {
      return { hasUpdate: false };
    }

    localStorage.setItem(STORAGE_LAST_CHECK_KEY, String(now));

    // 1. First check official GitHub Releases
    const releaseRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });

    if (releaseRes.ok) {
      const release = await releaseRes.json();
      const tagName = (release.tag_name || '').replace(/^v/, '');
      const dismissed = localStorage.getItem(STORAGE_DISMISSED_KEY);

      if (tagName && isVersionNewer(CURRENT_VERSION, tagName) && dismissed !== tagName) {
        return {
          hasUpdate: true,
          latestVersion: release.tag_name,
          releaseUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases`,
          releaseNotes: release.name || 'New release available with performance improvements and updates.'
        };
      }
    }

    // 2. Fallback check for new commits on main branch
    const commitRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/commits/main`, {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });

    if (commitRes.ok) {
      const commitData = await commitRes.json();
      const latestSha = (commitData.sha || '').slice(0, 7);
      const dismissedSha = localStorage.getItem(STORAGE_DISMISSED_KEY);

      // Check if commit message has a version bump or if SHA is marked new
      const commitMsg = commitData.commit?.message || '';
      const versionMatch = commitMsg.match(/v?(\d+\.\d+\.\d+)/);

      if (versionMatch && isVersionNewer(CURRENT_VERSION, versionMatch[1]) && dismissedSha !== versionMatch[1]) {
        return {
          hasUpdate: true,
          latestVersion: `v${versionMatch[1]}`,
          releaseUrl: `https://github.com/${GITHUB_REPO}`,
          releaseNotes: commitMsg.split('\n')[0]
        };
      }
    }
  } catch (err) {
    // Silent fail on network errors / offline mode
    console.debug('GitHub update check skipped (offline or rate limited):', err);
  }

  return { hasUpdate: false };
};

// Dismiss current update notification
export const dismissUpdateNotification = (versionTag) => {
  try {
    localStorage.setItem(STORAGE_DISMISSED_KEY, versionTag);
  } catch (e) {
    console.error('Failed to dismiss update', e);
  }
};

// Simple semver compare (returns true if remote is strictly greater than local)
function isVersionNewer(local, remote) {
  const lParts = local.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const rParts = remote.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);

  for (let i = 0; i < 3; i++) {
    const l = lParts[i] || 0;
    const r = rParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}
