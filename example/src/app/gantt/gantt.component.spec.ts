import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { GanttViewType } from 'ngx-gantt';
import { AppGanttExampleComponent } from './gantt.component';

describe('AppGanttExampleComponent export', () => {
    function createComponent(): AppGanttExampleComponent {
        return new AppGanttExampleComponent(
            {} as any,
            jasmine.createSpyObj('ThyNotifyService', ['warning']),
            {} as any,
            { queryParams: of({}) } as any
        );
    }

    it('exports the loaded rows with the project-specific file name', () => {
        const component = createComponent();
        component.projectId = 49;
        component.viewType = GanttViewType.day;
        component.items = [
            {
                id: 'plan-1',
                title: 'งานฐานราก -Plan',
                start: Date.UTC(2026, 0, 5) / 1000,
                end: Date.UTC(2026, 0, 6) / 1000,
                progress: 100
            }
        ];
        const downloadSpy = spyOn<any>(component, 'downloadFile');

        component.exportExcel();

        expect(downloadSpy).toHaveBeenCalledTimes(1);
        const [content, fileName, mimeType] = downloadSpy.calls.mostRecent().args as [string, string, string];
        expect(fileName).toBe('timeline-49.xls');
        expect(mimeType).toBe('application/vnd.ms-excel;charset=utf-8;');
        expect(content).toContain('งานฐานราก -Plan');
        expect(content).toContain('2026-01-05');
        expect(content).toContain('2026-01-06');
        const workbook = new DOMParser().parseFromString(content, 'application/xml');
        expect(workbook.querySelector('parsererror')).toBeNull();
        expect(workbook.getElementsByTagName('Row').length).toBe(2);
    });

    it('keeps the blob URL until after the download click is dispatched', fakeAsync(() => {
        const component = createComponent();
        const createUrlSpy = spyOn(URL, 'createObjectURL').and.returnValue('blob:timeline-export');
        const revokeUrlSpy = spyOn(URL, 'revokeObjectURL');
        const clickSpy = spyOn(HTMLAnchorElement.prototype, 'click');

        (component as any).downloadFile('export-content', 'timeline-49.xls', 'application/vnd.ms-excel');

        expect(createUrlSpy).toHaveBeenCalled();
        expect(clickSpy).toHaveBeenCalled();
        expect(revokeUrlSpy).not.toHaveBeenCalled();
        const link = document.querySelector('a[download="timeline-49.xls"]');
        expect(link).not.toBeNull();

        tick(0);

        expect(revokeUrlSpy).toHaveBeenCalledOnceWith('blob:timeline-export');
        expect(document.querySelector('a[download="timeline-49.xls"]')).toBeNull();
    }));
});
