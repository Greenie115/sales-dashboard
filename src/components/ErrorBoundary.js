import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState(prevState => ({
      error: error,
      errorInfo: errorInfo,
      errorCount: prevState.errorCount + 1
    }));
  }
  
  handleRetry = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorInfo: null
    });
  }

  render() {
    const { children, fallback } = this.props;
    
    if (this.state.hasError) {
      // You can render any custom fallback UI
      if (fallback) {
        return fallback(this.state.error, this.handleRetry);
      }
      
      return (
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            Something went wrong
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            We're sorry, but there was an error in this component. The rest of the dashboard should still work.
          </p>
          
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 mb-4"
          >
            Try Again
          </button>
          
          <details className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <summary className="cursor-pointer font-medium text-gray-800 dark:text-gray-200">
              Error details (for developers)
            </summary>
            <div className="mt-2 overflow-auto max-h-48">
              <p className="font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {this.state.error && this.state.error.toString()}
              </p>
              <p className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </p>
            </div>
          </details>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;