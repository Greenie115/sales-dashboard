import React from 'react';

class CalculationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Calculation Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback, fallbackProps = {} } = this.props;
      
      if (Fallback) {
        return <Fallback error={this.state.error} {...fallbackProps} />;
      }
      
      return (
        <div className="flex items-center justify-center h-32 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
          <div className="text-center">
            <svg className="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.866-.833-2.636 0L4.178 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Calculation Error</h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Unable to process data. Please check your dataset.</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
              className="mt-2 px-3 py-1 bg-pink-600 text-white text-xs rounded-md hover:bg-pink-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalculationErrorBoundary;