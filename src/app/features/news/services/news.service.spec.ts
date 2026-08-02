import { NewsService } from './news.service';

describe('NewsService', () => {
  it('getNews() отдаёт мок-новости закреплённой сетки', () => {
    const service = new NewsService();

    let news;
    service.getNews().subscribe((value) => (news = value));

    expect(news).toBeDefined();
    expect(news!.length).toBeGreaterThan(0);
  });
});
