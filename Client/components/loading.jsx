// components/common/LoadingSpinner.js
export default function LoadingSpinner() {
    return (
      <div className="flex justify-center items-center">
        <div className="w-12 h-12 border-4 border-blue-200 dark:border-blue-900 rounded-full border-t-blue-600 dark:border-t-blue-400 animate-spin"></div>
      </div>
    );
  }