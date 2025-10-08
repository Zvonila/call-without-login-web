
interface IPageObject {
    path: string;
    id: string;
}

export class PageController {
    private pages: IPageObject[] = [];
    private currentPage: string = "";

    constructor(pages: IPageObject[]) {
        this.pages = pages;
        this.initRouter();
    }

    private initRouter() {
        const pathname = window.location.pathname;
        this.pages.forEach(el => {
            if (el.path === pathname) {
                this.currentPage = el.path;
                return this.showPage(el.id)
            }

            this.hidePage(el.id)
        })
    }

    private hidePage(id: string) {
        const page = document.querySelector(`#${id}`) as HTMLElement;
        page.style.display = "none";
    }

    private showPage(id: string) {
        const page = document.querySelector(`#${id}`) as HTMLElement;
        page.style.display = "inherit";
    }

    public goTo(path: string) {
        if (path !== this.currentPage) {
            this.pages.forEach(el => {
                if (el.path === path) {
                    this.currentPage = el.path
                    return this.showPage(el.id)
                }

                this.hidePage(el.id)
            })
        }
    }

    public getRoute(): string {
        return this.currentPage.slice(1)
    }
}