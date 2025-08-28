import { GifService } from '../../services/gif.service';

export class GifSelectorElement {
    private container!: HTMLElement;
    private searchInput!: HTMLInputElement;
    private gifGrid!: HTMLElement;
    private categoriesContainer!: HTMLElement;
    private loadingIndicator!: HTMLElement;
    private previewContainer!: HTMLElement;
    private gifService: GifService;
    private selectedGif: GifResult | null = null;
    private currentGifs: GifResult[] = [];
    private onGifSelect: (gif: GifResult) => void;
    private onClose: () => void;
    private searchTimeout: number | null = null;
    private isLoading: boolean = false;
    private clickOutsideHandler: (e: Event) => void;

    constructor(onGifSelect: (gif: GifResult) => void, onClose: () => void) {
        this.onGifSelect = onGifSelect;
        this.onClose = onClose;
        this.gifService = GifService.getInstance();

        // Bind the click outside handler to preserve 'this' context
        this.clickOutsideHandler = (e: Event) => {
            if (!this.container.contains(e.target as Node)) {
                this.onClose();
            }
        };

        this.createElement();
        this.setupEventListeners();
        this.loadFirstCategory();
    }

    private createElement(): void {
        this.container = document.createElement('div');
        this.container.className = 'gif-selector';
        this.container.innerHTML = `
            <div class="gif-selector-header">
                <div class="gif-selector-title">
                    <span class="gif-selector-title-text">Choose a GIF <span style="font-size: small">provided by FlowlyWeb</span></span>
                    <button class="gif-selector-close" aria-label="Close">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M12.8 3.2L8 8l4.8 4.8-1.2 1.2L8 9.2 3.2 14l-1.2-1.2L6.8 8 2 3.2 3.2 2 8 6.8 12.8 2z"/>
                        </svg>
                    </button>
                </div>
                <div class="gif-search-container">
                    <input type="text" class="gif-search-input" placeholder="Search for GIFs" autocomplete="off">
                    <div class="gif-search-icon">
                        <svg width="16" height="16" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div class="gif-selector-body">
                <div class="gif-categories">
                    <!-- Categories will be populated here -->
                </div>
                <div class="gif-content">
                    <div class="gif-grid">
                        <!-- GIFs will be populated here -->
                    </div>
                    <div class="gif-loading">
                        <div class="gif-loading-spinner"></div>
                        <span>Loading GIFs...</span>
                    </div>
                </div>
                <div class="gif-preview-container" style="display: none;">
                    <div class="gif-preview-header">
                        <h3>Add a message with your GIF</h3>
                        <button class="gif-preview-back" aria-label="Back">
                            <svg width="16" height="16" viewBox="0 0 16 16">
                                <path d="M8 1l-1.5 1.5L11 7H1v2h10l-4.5 4.5L8 15l7-7-7-7z" transform="rotate(180 8 8)"/>
                            </svg>
                            Back
                        </button>
                    </div>
                    <div class="gif-preview-content">
                        <div class="gif-preview-image">
                            <!-- Selected GIF will be shown here -->
                        </div>
                        <div class="gif-preview-text">
                            <textarea class="gif-text-input" placeholder="Add a message (optional)" maxlength="280"></textarea>
                            <div class="gif-preview-actions">
                                <button class="gif-send-button">Send GIF</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.searchInput = this.container.querySelector('.gif-search-input') as HTMLInputElement;
        this.gifGrid = this.container.querySelector('.gif-grid') as HTMLElement;
        this.categoriesContainer = this.container.querySelector('.gif-categories') as HTMLElement;
        this.loadingIndicator = this.container.querySelector('.gif-loading') as HTMLElement;
        this.previewContainer = this.container.querySelector('.gif-preview-container') as HTMLElement;

        this.createCategories();
        this.hideLoading();
    }

    private createCategories(): void {
        const categories = this.gifService.getPopularCategories();

        categories.forEach((category, index) => {
            const categoryElement = document.createElement('button');
            categoryElement.className = `gif-category ${index === 0 ? 'active' : ''}`;
            categoryElement.innerHTML = `
                <span class="gif-category-emoji">${category.previewGif}</span>
                <span class="gif-category-name">${category.name}</span>
            `;
            categoryElement.addEventListener('click', () => this.selectCategory(category, categoryElement));
            this.categoriesContainer.appendChild(categoryElement);
        });
    }

    private setupEventListeners(): void {
        // Close button
        const closeButton = this.container.querySelector('.gif-selector-close');
        closeButton?.addEventListener('click', this.onClose);

        // Search input
        this.searchInput.addEventListener('input', (e) => {
            const query = (e.target as HTMLInputElement).value.trim();
            this.handleSearch(query);
        });

        // Keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.onClose();
            }
        });

        // Click outside to close - use setTimeout to ensure it runs after other handlers
        setTimeout(() => {
            document.addEventListener('click', this.clickOutsideHandler);
        }, 0);

        // Prevent closing when clicking inside the selector
        this.container.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Preview back button
        const backButton = this.container.querySelector('.gif-preview-back');
        backButton?.addEventListener('click', () => this.hidePreview());

        // Send GIF button
        const sendButton = this.container.querySelector('.gif-send-button');
        sendButton?.addEventListener('click', () => this.sendGifWithText());
    }

    private handleSearch(query: string): void {
        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Reset category selection
        this.categoriesContainer.querySelectorAll('.gif-category').forEach(cat => {
            cat.classList.remove('active');
        });

        // Debounce search
        this.searchTimeout = window.setTimeout(() => {
            if (query.length === 0) {
                this.loadFirstCategory();
            } else {
                this.searchGifs(query);
            }
        }, 300);
    }

    private async searchGifs(query: string): Promise<void> {
        if (this.isLoading) return;

        this.showLoading();
        this.isLoading = true;

        try {
            const gifs = await this.gifService.searchGifs(query, 20);
            this.currentGifs = gifs;
            this.renderGifs();
        } catch (error) {
            console.error('Error searching GIFs:', error);
            this.renderError();
        } finally {
            this.hideLoading();
            this.isLoading = false;
        }
    }

    private loadFirstCategory(): void {
        const categories = this.gifService.getPopularCategories();
        if (categories.length > 0) {
            this.searchGifs(categories[0].searchTerm);
        }
    }

    private async selectCategory(category: GifCategory, categoryElement: HTMLElement): Promise<void> {
        // Update active category
        this.categoriesContainer.querySelectorAll('.gif-category').forEach(cat => {
            cat.classList.remove('active');
        });
        categoryElement.classList.add('active');

        // Clear search input
        this.searchInput.value = '';

        // Load category GIFs
        this.searchGifs(category.searchTerm);
    }

    private renderGifs(): void {
        this.gifGrid.innerHTML = '';

        if (this.currentGifs.length === 0) {
            this.renderNoResults();
            return;
        }

        this.currentGifs.forEach(gif => {
            const gifElement = document.createElement('div');
            gifElement.className = 'gif-item';
            gifElement.innerHTML = `
                <img src="${gif.previewUrl}" alt="${gif.title}" loading="lazy">
                <div class="gif-overlay">
                    <button class="gif-select-btn">Select</button>
                </div>
            `;

            // Add click handler
            gifElement.addEventListener('click', () => {
                this.showGifPreview(gif);
            });

            // Add hover effect
            gifElement.addEventListener('mouseenter', () => {
                const img = gifElement.querySelector('img') as HTMLImageElement;
                img.src = gif.url; // Show full GIF on hover
            });

            gifElement.addEventListener('mouseleave', () => {
                const img = gifElement.querySelector('img') as HTMLImageElement;
                img.src = gif.previewUrl; // Back to preview
            });

            this.gifGrid.appendChild(gifElement);
        });
    }

    private renderNoResults(): void {
        this.gifGrid.innerHTML = `
            <div class="gif-no-results">
                <div class="gif-no-results-icon">🔍</div>
                <div class="gif-no-results-text">No GIFs found</div>
                <div class="gif-no-results-subtext">Try a different search term</div>
            </div>
        `;
    }

    private renderError(): void {
        this.gifGrid.innerHTML = `
            <div class="gif-error">
                <div class="gif-error-icon">⚠️</div>
                <div class="gif-error-text">Failed to load GIFs</div>
                <div class="gif-error-subtext">Check your internet connection</div>
            </div>
        `;
    }

    private showLoading(): void {
        this.loadingIndicator.style.display = 'flex';
        this.gifGrid.style.display = 'none';
    }

    private hideLoading(): void {
        this.loadingIndicator.style.display = 'none';
        this.gifGrid.style.display = 'grid';
    }

    public show(): void {
        this.container.style.display = 'block';
        this.searchInput.focus();
    }

    public hide(): void {
        this.container.style.display = 'none';
    }

    public getElement(): HTMLElement {
        return this.container;
    }

    private showGifPreview(gif: GifResult): void {
        this.selectedGif = gif;
        
        // Hide the main content and header elements
        const mainContent = this.container.querySelector('.gif-content') as HTMLElement;
        const categories = this.container.querySelector('.gif-categories') as HTMLElement;
        const header = this.container.querySelector('.gif-selector-header') as HTMLElement;
        
        mainContent.style.display = 'none';
        categories.style.display = 'none';
        header.style.display = 'none';
        
        // Show preview
        this.previewContainer.style.display = 'block';
        
        // Set the GIF image
        const previewImage = this.previewContainer.querySelector('.gif-preview-image') as HTMLElement;
        previewImage.innerHTML = `
            <img src="${gif.url}" alt="${gif.title}" class="gif-preview-img">
            <div class="gif-preview-title">${gif.title}</div>
        `;
        
        // Focus on the text input
        const textInput = this.previewContainer.querySelector('.gif-text-input') as HTMLTextAreaElement;
        textInput.focus();
    }

    private hidePreview(): void {
        // Show the main content and header elements
        const mainContent = this.container.querySelector('.gif-content') as HTMLElement;
        const categories = this.container.querySelector('.gif-categories') as HTMLElement;
        const header = this.container.querySelector('.gif-selector-header') as HTMLElement;
        
        mainContent.style.display = 'block';
        categories.style.display = 'block';
        header.style.display = 'block';
        
        // Hide preview
        this.previewContainer.style.display = 'none';
        
        // Clear selected GIF
        this.selectedGif = null;
        
        // Clear text input
        const textInput = this.previewContainer.querySelector('.gif-text-input') as HTMLTextAreaElement;
        textInput.value = '';
    }

    private sendGifWithText(): void {
        if (!this.selectedGif) return;
        
        const textInput = this.previewContainer.querySelector('.gif-text-input') as HTMLTextAreaElement;
        const text = textInput.value.trim();
        
        // Create a combined result with text and GIF
        const gifWithText = {
            ...this.selectedGif,
            attachedText: text
        };
        
        this.onGifSelect(gifWithText);
    }

    public destroy(): void {
        // Clean up event listeners
        document.removeEventListener('click', this.clickOutsideHandler);

        // Clear timeouts
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Remove from DOM
        this.container.remove();
    }
}