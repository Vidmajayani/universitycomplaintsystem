import os
import json
import glob
from datetime import datetime

# Define where test results are stored
RESULTS_DIR = os.path.join("tests", "reports", "allure-results")
# Define where the final report will be saved
OUTPUT_FILE = os.path.join("tests", "reports", "report.html")


def generate():
    results = []

    # Load all JSON result files from the results directory
    if os.path.exists(RESULTS_DIR):
        for f in glob.glob(os.path.join(RESULTS_DIR, "*-result.json")):
            try:
                with open(f, "r", encoding="utf-8") as file:
                    results.append(json.load(file))
            except:
                pass  # Ignore files that can't be read

    # Sort results: Failed/Broken first, then by start time
    status_prio = {"failed": 0, "broken": 1, "passed": 2, "skipped": 3}
    results.sort(
        key=lambda x: (
            status_prio.get(x.get("status", "skipped"), 99),
            x.get("start", 0),
        )
    )

    # Define logo paths
    logo_path = "../../public/images/BGlessLogo.png"
    logo_dark_path = "../../public/images/BGlessLogoDark.png"

    # Start building the HTML string
    html = f"""
    <!DOCTYPE html>
    <html lang="en" class="dark">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ComplaNet — Automated Test Report</title>
        <!-- Use Tailwind CSS for styling -->
        <script src="https://cdn.tailwindcss.com"></script>
        <!-- Use Alpine.js for interactivity -->
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        
        <script>
            // Configure Tailwind to support dark mode and custom colors
            tailwind.config = {{
                darkMode: 'class',
                theme: {{
                    extend: {{
                        colors: {{
                            'bg-light': '#F5F6F8',
                            'bg-dark': '#1E1E1E',
                            'eco-light': '#E3F2FD',
                            'eco': '#a6e3ff',
                            'eco-dark': '#2b88ba',
                            'greenvine': '#1d4ed8'
                        }},
                        fontFamily: {{
                            sans: ['Poppins', 'sans-serif'],
                        }}
                    }}
                }}
            }}
        </script>
        <style>
            /* Custom styles for dashboard cards and scrollbar */
            :root {{
                --card-total-from: #3b82f6; --card-total-to: #2563eb;
                --card-pending-from: #eab308; --card-pending-to: #f97316;
                --card-progress-from: #a855f7; --card-progress-to: #4f46e5;
                --card-resolved-from: #22c55e; --card-resolved-to: #10b981;
            }}
            body {{ font-family: 'Poppins', sans-serif; }}
            [x-cloak] {{ display: none !important; }}
            .dashboard-card-total {{ background: linear-gradient(to bottom right, var(--card-total-from), var(--card-total-to)); }}
            .dashboard-card-resolved {{ background: linear-gradient(to bottom right, var(--card-resolved-from), var(--card-resolved-to)); }}
            ::-webkit-scrollbar {{ width: 8px; }}
            ::-webkit-scrollbar-track {{ background: #1E1E1E; }}
            ::-webkit-scrollbar-thumb {{ background: #424242; border-radius: 4px; }}
        </style>
    </head>
    <body class="flex flex-col min-h-screen bg-[#F5F6F8] text-[#2B2B2B] dark:bg-[#1E1E1E] dark:text-white transition-all duration-300 font-sans" x-data="app()">

        <!-- Header Section -->
        <header class="flex items-center justify-between px-3 md:px-6 py-4 bg-pink dark:bg-gray-800 shadow-md">
            <div class="flex items-center">
                <img src="{logo_dark_path}" alt="ComplaNet Logo" class="h-16 block dark:hidden">
                <img src="{logo_path}" alt="ComplaNet Logo Dark" class="h-16 hidden dark:block">
            </div>
            <div class="hidden md:flex space-x-6 items-center">
                <span class="font-semibold text-xl text-eco-dark dark:text-eco">Automated Test Report</span>
            </div>
            <div class="text-sm text-gray-500 dark:text-gray-300 font-medium">
                {datetime.now().strftime("%B %d, %Y")}
            </div>
        </header>

        <!-- Main Dashboard Content -->
        <main class="flex-1 px-6 py-8 md:px-10">
            <div class="mb-8">
                <h1 class="text-3xl font-bold mb-2">Test Dashboard</h1>
                <p class="text-gray-600 dark:text-gray-300">Monitor automated test execution results and status.</p>
            </div>

            <!-- Statistics Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 mb-10">
                <!-- Total Tests -->
                <div class="dashboard-card-total text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-blue-100 text-sm font-medium mb-1">Total Tests</p>
                            <h3 class="text-3xl font-bold" x-text="stats.total"></h3>
                        </div>
                        <div class="bg-white bg-opacity-20 rounded-full p-3"><i class="fas fa-clipboard-list text-2xl"></i></div>
                    </div>
                </div>
                <!-- Passed Tests -->
                <div class="dashboard-card-resolved text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-green-100 text-sm font-medium mb-1">Passed</p>
                            <h3 class="text-3xl font-bold" x-text="stats.passed"></h3>
                        </div>
                        <div class="bg-white bg-opacity-20 rounded-full p-3"><i class="fas fa-check-circle text-2xl"></i></div>
                    </div>
                </div>
                <!-- Failed Tests -->
                <div class="bg-red-500 text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-red-100 text-sm font-medium mb-1">Failed</p>
                            <h3 class="text-3xl font-bold" x-text="stats.failed"></h3>
                        </div>
                        <div class="bg-white bg-opacity-20 rounded-full p-3"><i class="fas fa-exclamation-triangle text-2xl"></i></div>
                    </div>
                </div>
                <!-- Success Rate -->
                <div class="dashboard-card-progress text-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div class="flex items-center justify-between">
                        <div>
                            <p class="text-purple-100 text-sm font-medium mb-1">Success Rate</p>
                            <h3 class="text-3xl font-bold" x-text="passRate + '%'"></h3>
                        </div>
                        <div class="bg-white bg-opacity-20 rounded-full p-3"><i class="fas fa-chart-pie text-2xl"></i></div>
                    </div>
                </div>
            </div>

            <!-- Test List Section -->
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-4">
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl font-bold text-gray-800 dark:text-gray-200">Test Log</h2>
                    <!-- Filters -->
                    <div class="flex gap-2">
                         <button @click="filter = 'all'" :class="filter === 'all' ? 'text-eco-dark dark:text-eco font-bold' : 'text-gray-500 hover:text-gray-300'" class="text-sm transition-colors">All</button>
                         <span class="text-gray-400">|</span>
                         <button @click="filter = 'failed'" :class="filter === 'failed' ? 'text-red-500 font-bold' : 'text-gray-500 hover:text-gray-300'" class="text-sm transition-colors">Failed</button>
                    </div>
                </div>
                
                <!-- Desktop View: Table -->
                <div class="hidden md:block overflow-x-auto">
                    <table class="min-w-full bg-white dark:bg-gray-800">
                        <thead class="text-gray-500 dark:text-gray-400 uppercase text-xs leading-normal border-b dark:border-gray-700">
                            <tr>
                                <th class="py-3 px-6 text-left">Test Name</th>
                                <th class="py-3 px-6 text-left">Duration</th>
                                <th class="py-3 px-6 text-center">Status</th>
                                <th class="py-3 px-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="text-gray-600 dark:text-gray-300 text-sm font-light">
                            <template x-for="test in filteredTests" :key="test.uuid">
                                <tr class="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                    <td class="py-3 px-6 text-left font-medium text-gray-800 dark:text-gray-200">
                                        <div x-text="test.name"></div>
                                    </td>
                                    <td class="py-3 px-6 text-left font-mono text-xs" x-text="formatDuration(test.stop - test.start)"></td>
                                    <td class="py-3 px-6 text-center">
                                         <span class="py-1 px-3 rounded-full text-xs font-bold uppercase"
                                              :class="{{
                                                'passed': 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
                                                'failed': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
                                                'broken': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
                                                'skipped': 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                              }}[test.status]" 
                                              x-text="test.status"></span>
                                    </td>
                                    <td class="py-3 px-6 text-center">
                                        <button 
                                            @click="openModal(test)"
                                            class="px-3 py-1.5 rounded-md text-xs font-semibold text-white shadow-sm transition-all focus:outline-none"
                                            :class="['passed', 'skipped'].includes(test.status) ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md'"
                                            :disabled="['passed', 'skipped'].includes(test.status)">
                                            View
                                        </button>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>

                <!-- Mobile View: Cards -->
                <div class="md:hidden grid grid-cols-1 gap-4">
                    <template x-for="test in filteredTests" :key="'card-' + test.uuid">
                        <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 flex flex-col space-y-3">
                            <div class="flex justify-between items-start gap-3">
                                <h3 class="font-bold text-gray-800 dark:text-white text-sm leading-tight break-all flex-1 min-w-0" x-text="test.name"></h3>
                                <div class="shrink-0">
                                    <span class="py-1 px-2 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap block"
                                        :class="{{
                                            'passed': 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
                                            'failed': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
                                            'broken': 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
                                            'skipped': 'bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                                        }}[test.status]" 
                                        x-text="test.status"></span>
                                </div>
                            </div>
                            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-300 pt-2 border-t dark:border-gray-600">
                                <span class="bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded font-mono" x-text="formatDuration(test.stop - test.start)"></span>
                                <div>
                                    <button 
                                        @click="openModal(test)"
                                        class="text-blue-500 hover:text-blue-400 font-bold uppercase tracking-wide text-xs"
                                        :class="['passed', 'skipped'].includes(test.status) ? 'hidden' : ''">
                                        View Details &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
                
                 <div x-show="filteredTests.length === 0" class="text-center py-6 text-gray-500">No records found.</div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="w-full py-6 mt-2 bg-eco-light text-[#2B2B2B] dark:bg-[#0F1A24] dark:text-gray-200 text-center">
             <div class="max-w-7xl mx-auto px-6">
                <p class="font-medium text-sm">ComplaNet Test Report</p>
                <p class="text-xs text-gray-500 mt-1">© 2025 All Rights Reserved</p>
            </div>
        </footer>
        
        <!-- Details Modal -->
        <div x-show="activeTest" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" x-cloak 
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0"
             x-transition:enter-end="opacity-100">
             
            <div @click.away="closeModal()" class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 md:p-6 w-11/12 max-w-2xl transform transition-all scale-100 my-4 max-h-[90vh] flex flex-col">
                 <div class="flex justify-between items-start mb-4 border-b dark:border-gray-700 pb-4 shrink-0">
                     <h3 class="text-lg md:text-xl font-bold text-gray-900 dark:text-white break-words pr-4" x-text="activeTest?.name"></h3>
                     <button @click="closeModal()" class="text-gray-500 hover:text-gray-300 focus:outline-none shrink-0"><i class="fas fa-times text-xl"></i></button>
                 </div>
                 
                 <div class="space-y-4 overflow-y-auto pr-2 grow">
                     <template x-if="activeTest && ['failed', 'broken'].includes(activeTest.status)">
                         <div>
                            <h4 class="text-red-500 font-bold text-sm mb-2 uppercase tracking-wide">Error Message</h4>
                            <div class="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-4 rounded-lg text-red-600 dark:text-red-400 font-mono text-xs whitespace-pre-wrap break-all" x-text="activeTest.statusDetails?.message"></div>
                            <template x-if="activeTest.statusDetails?.trace">
                                <div class="mt-4">
                                     <h4 class="text-gray-500 dark:text-gray-400 font-bold text-sm mb-2 uppercase tracking-wide">Stack Trace</h4>
                                     <div class="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700 font-mono text-[10px] text-gray-600 dark:text-gray-400 overflow-y-auto max-h-60 whitespace-pre-wrap break-all" x-text="activeTest.statusDetails?.trace"></div>
                                </div>
                            </template>
                         </div>
                     </template>
                 </div>
                 <div class="mt-6 flex justify-end shrink-0">
                     <button @click="closeModal()" class="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-medium shadow-md transition-colors text-sm">Close</button>
                 </div>
            </div>
        </div>

        <script>
            // Vue/Alpine logic for the dashboard
            function app() {{
                return {{
                    tests: {json.dumps(results)},
                    filter: 'all',
                    activeTest: null,
                    
                    // Calculate statistics
                    get stats() {{
                        const total = this.tests.length;
                        const passed = this.tests.filter(t => t.status === 'passed').length;
                        const failed = this.tests.filter(t => [ 'failed', 'broken' ].includes(t.status)).length;
                        return {{ total, passed, failed }};
                    }},
                    
                    // Calculate pass rate percentage
                    get passRate() {{
                         if (this.stats.total === 0) return 0;
                         return Math.round((this.stats.passed / this.stats.total) * 100);
                    }},

                    // Filter tests based on status
                    get filteredTests() {{
                        return this.tests.filter(t => {{
                            const isFailed = ['failed', 'broken'].includes(t.status);
                            return this.filter === 'all' || (this.filter === 'failed' && isFailed);
                        }});
                    }},
                    
                    // Open modal details
                    openModal(test) {{
                        if (['passed', 'skipped'].includes(test.status)) return;
                        this.activeTest = test;
                    }},
                    
                    closeModal() {{
                        this.activeTest = null;
                    }},
                    
                    // Format duration nicely
                    formatDuration(ms) {{
                        if (ms < 1000) return ms + 'ms';
                        return (ms / 1000).toFixed(2) + 's';
                    }}
                }}
            }}
        </script>
    </body>
    </html>
    """
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Generated: {OUTPUT_FILE}")


if __name__ == "__main__":
    generate()
