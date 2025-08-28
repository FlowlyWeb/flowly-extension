interface GifResult {
    id: string;
    url: string;
    previewUrl: string;
    title: string;
    tags: string[];
    width: number;
    height: number;
    attachedText?: string;
}

interface GifSearchResponse {
    results: GifResult[];
    next?: string;
}

interface GifCategory {
    name: string;
    searchTerm: string;
    previewGif: string;
}

interface GifSelectorPosition {
    x: number;
    y: number;
    container: HTMLElement;
}