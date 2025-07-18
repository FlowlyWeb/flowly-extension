export class GifService {
    private static instance: GifService;
    private readonly TENOR_API_KEY = 'AIzaSyAY1A3v85jP7SBVehjFxK3hUjL81S22DlA'; // Free API Key, Tenor is free.
    private readonly TENOR_BASE_URL = 'https://tenor.googleapis.com/v2';
    private cache: Map<string, GifSearchResponse> = new Map();
    private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    private cacheTimestamps: Map<string, number> = new Map();

    public static getInstance(): GifService {
        if (!GifService.instance) {
            GifService.instance = new GifService();
        }
        return GifService.instance;
    }

    private constructor() {}

    private isCacheValid(key: string): boolean {
        const timestamp = this.cacheTimestamps.get(key);
        if (!timestamp) return false;
        return Date.now() - timestamp < this.CACHE_DURATION;
    }

    private setCacheEntry(key: string, data: GifSearchResponse): void {
        this.cache.set(key, data);
        this.cacheTimestamps.set(key, Date.now());
    }

    private getCacheEntry(key: string): GifSearchResponse | null {
        if (this.isCacheValid(key)) {
            return this.cache.get(key) || null;
        }
        // Clean up expired cache
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        return null;
    }

    private transformTenorResponse(response: any): GifResult[] {
        return response.results?.map((item: any) => ({
            id: item.id,
            url: item.media_formats?.gif?.url || item.media_formats?.mp4?.url,
            previewUrl: item.media_formats?.tinygif?.url || item.media_formats?.gif?.url,
            title: item.content_description || 'GIF',
            tags: item.tags || [],
            width: item.media_formats?.gif?.dims?.[0] || 200,
            height: item.media_formats?.gif?.dims?.[1] || 200
        })) || [];
    }

    async searchGifs(query: string, limit: number = 20): Promise<GifResult[]> {
        const cacheKey = `search:${query}:${limit}`;
        const cached = this.getCacheEntry(cacheKey);

        if (cached) {
            return cached.results;
        }

        try {
            const url = `${this.TENOR_BASE_URL}/search?key=${this.TENOR_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&media_filter=gif,tinygif`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const results = this.transformTenorResponse(data);

            this.setCacheEntry(cacheKey, { results });
            return results;
        } catch (error) {
            console.error('Error searching GIFs:', error);
            // Fallback to demo GIFs if API fails
            return this.getDemoGifs().filter(gif =>
                gif.title.toLowerCase().includes(query.toLowerCase()) ||
                gif.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
            );
        }
    }

    getPopularCategories(): GifCategory[] {
        return [
            { name: 'Happy', searchTerm: 'happy excited', previewGif: '😊' },
            { name: 'Sad', searchTerm: 'sad crying', previewGif: '😢' },
            { name: 'Funny', searchTerm: 'funny hilarious', previewGif: '😂' },
            { name: 'Love', searchTerm: 'love heart', previewGif: '❤️' },
        ];
    }

    clearCache(): void {
        this.cache.clear();
        this.cacheTimestamps.clear();
    }

    private getDemoGifs(): GifResult[] {
        return [
            {
                id: 'demo1',
                url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
                title: 'Happy Dance',
                tags: ['happy', 'dance', 'celebration'],
                width: 200,
                height: 200
            },
            {
                id: 'demo2',
                url: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif',
                title: 'Thumbs Up',
                tags: ['thumbs', 'up', 'approve', 'good'],
                width: 200,
                height: 200
            },
            {
                id: 'demo3',
                url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
                title: 'Clapping',
                tags: ['clap', 'applause', 'bravo'],
                width: 200,
                height: 200
            },
            {
                id: 'demo4',
                url: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/XreQmk7ETCak0/giphy.gif',
                title: 'Confused',
                tags: ['confused', 'what', 'question'],
                width: 200,
                height: 200
            },
            {
                id: 'demo5',
                url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
                title: 'Heart Eyes',
                tags: ['love', 'heart', 'eyes', 'amazing'],
                width: 200,
                height: 200
            },
            {
                id: 'demo6',
                url: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
                title: 'Facepalm',
                tags: ['facepalm', 'frustrated', 'disappointed'],
                width: 200,
                height: 200
            },
            {
                id: 'demo7',
                url: 'https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/3oz8xLd9DJq2l2VFtu/giphy.gif',
                title: 'Laughing',
                tags: ['laugh', 'funny', 'hilarious'],
                width: 200,
                height: 200
            },
            {
                id: 'demo8',
                url: 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif',
                previewUrl: 'https://media.giphy.com/media/26AHPxxnSw1L9T1rW/giphy.gif',
                title: 'Thinking',
                tags: ['thinking', 'hmm', 'pondering'],
                width: 200,
                height: 200
            }
        ];
    }
}