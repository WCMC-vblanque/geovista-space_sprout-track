/**
 * Styles for the WeeklyTip component
 *
 * These styles use Tailwind CSS classes and are designed to be compatible
 * with the project's design system and dark mode support.
 */

export const weeklyTipStyles = {
  container: "border border-gray-200 bg-white shadow-sm weekly-tip-container",
  header: "flex items-center gap-2 p-3 border-b border-gray-200 weekly-tip-header",
  headerIcon: "text-indigo-500 flex-shrink-0",
  headerText: "font-medium text-gray-500 weekly-tip-header-text",
  body: "p-4 weekly-tip-body",
  title: "text-sm font-semibold text-gray-900 mb-1 weekly-tip-title",
  text: "text-sm text-gray-700 weekly-tip-text",
  source: "mt-3 text-xs text-gray-400 weekly-tip-source",
  sourceLink: "underline hover:text-gray-600 weekly-tip-source-link",
} as const;
