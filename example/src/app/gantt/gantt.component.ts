import { AfterViewInit, Component, HostBinding, OnInit, ViewChild } from '@angular/core';
import {
    GanttBarClickEvent,
    GanttBaselineItem,
    GanttDragEvent,
    GanttItem,
    GanttLineClickEvent,
    GanttLinkDragEvent,
    GanttPrintService,
    GanttSelectedEvent,
    GanttTableDragDroppedEvent,
    GanttTableDragEndedEvent,
    GanttTableDragEnterPredicateContext,
    GanttTableDragStartedEvent,
    GanttTableItemClickEvent,
    GanttToolbarOptions,
    GanttView,
    GanttViewType,
    NgxGanttComponent
} from 'ngx-gantt';
import { ThyNotifyService } from 'ngx-tethys/notify';
import { finalize, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { random, randomItems } from '../helper';
import { TimelineServices } from '../services/timeline.service';
import { ActivatedRoute } from '@angular/router';

const cacheKeys = 'GANTT_TABLE_KEYS';

@Component({
    selector: 'app-gantt-example',
    templateUrl: './gantt.component.html',
    styleUrls: ['./gantt.scss'],
    providers: [GanttPrintService],
    standalone: false
})
export class AppGanttExampleComponent implements OnInit, AfterViewInit {
    toolbarOptions: GanttToolbarOptions = {
        viewTypes: [ 
            GanttViewType.day,
            GanttViewType.week,
            GanttViewType.month,
            GanttViewType.quarter,
            GanttViewType.year
        ]
    };

    projectId:number;
    projectType = 'SC';

    viewType: GanttViewType = GanttViewType.month;

    selectedViewType: GanttViewType = GanttViewType.month;

    isBaselineChecked = false;

    isShowToolbarChecked = true;

    loading = false;

    items: GanttItem[] = [];

    baselineItems: GanttBaselineItem[] = [];

    options = {
        viewType: GanttViewType.day
    };

    viewOptions = {};

    width = JSON.parse(localStorage.getItem(cacheKeys));

    @HostBinding('class.gantt-example-component') class = true;

    @ViewChild('gantt') ganttComponent: NgxGanttComponent;

    dropEnterPredicate = (event: GanttTableDragEnterPredicateContext) => {
        return true;
    };

    constructor(
        private printService: GanttPrintService,
        private thyNotify: ThyNotifyService,
        private timelineServices:TimelineServices,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        
        this.route.queryParams.subscribe(params => {

            this.projectId = params.projectId;    
            this.projectType = String(
                params.projectType ?? (String(params.workspace ?? '').toUpperCase() === 'SF' ? 'SF' : 'SC')
            ).trim().toUpperCase();
            if(this.projectId>0){ 
                this.initalPage();
            }
               
        });
  
    }

    ngAfterViewInit() {

        const now = new Date(); 
        const utcMs = now.getTime(); 
        // ถ้าอยากบังคับ GMT+7 (Bangkok)
        const offsetMs = 7 * 60 * 60 * 1000; // 7 ชั่วโมง
        const bkkUnixSec = Math.floor((utcMs + offsetMs) / 1000); 

        setTimeout(() => this.ganttComponent.scrollToDate(bkkUnixSec), 200);
    }

    scrollToToday() {
        this.ganttComponent.scrollToToday();
    }
 
    selectView(type: GanttViewType) {
        this.viewType = type;
        this.selectedViewType = type;
    }

    viewChange(event: GanttView) {
        console.log(event.viewType);
        this.selectedViewType = event.viewType;
    }

    refresh() {
        this.initalPage();
    }

    exportExcel() {
        const rows = this.flattenItems(this.items);
        const exportViewType = this.selectedViewType || this.viewType;
        const datedRows = rows
            .map((item) => ({
                ...item,
                normalizedStart: this.normalizeDate(item.start),
                normalizedEnd: this.normalizeDate(item.end)
            }))
            .filter((item) => item.normalizedStart || item.normalizedEnd);

        if (!datedRows.length) {
            this.thyNotify.warning('No dated tasks available to export.');
            return;
        }

        const minDate = datedRows.reduce((result, item) => {
            const itemStart = item.normalizedStart || item.normalizedEnd;
            return itemStart < result ? itemStart : result;
        }, datedRows[0].normalizedStart || datedRows[0].normalizedEnd);
        const maxDate = datedRows.reduce((result, item) => {
            const itemEnd = item.normalizedEnd || item.normalizedStart;
            return itemEnd > result ? itemEnd : result;
        }, datedRows[0].normalizedEnd || datedRows[0].normalizedStart);

        const timeBuckets = this.buildTimeBuckets(exportViewType, minDate, maxDate);
        const worksheetRows = [
            `<Row ss:AutoFitHeight="0" ss:Height="24">
                <Cell ss:StyleID="header"><Data ss:Type="String">Title</Data></Cell>
                <Cell ss:StyleID="header"><Data ss:Type="String">Start Time</Data></Cell>
                <Cell ss:StyleID="header"><Data ss:Type="String">End Time</Data></Cell>
                <Cell ss:StyleID="header"><Data ss:Type="String">Progress</Data></Cell>
                ${timeBuckets
                    .map(
                        (bucket) =>
                            `<Cell ss:StyleID="headerDate"><Data ss:Type="String">${this.escapeXml(
                                bucket.label
                            )}</Data></Cell>`
                    )
                    .join('')}
            </Row>`,
            ...rows.map((item) => {
                const start = this.normalizeDate(item.start);
                const end = this.normalizeDate(item.end);
                const effectiveStart = start || end;
                const effectiveEnd = end || start;
                const ganttBarStyle = this.isPlanRecord(item) ? 'ganttBarPlan' : 'ganttBar';

                return `<Row>
                    <Cell ss:StyleID="text"><Data ss:Type="String">${this.escapeXml(
                        `${' '.repeat(item.level * 2)}${item.title || ''}`
                    )}</Data></Cell>
                    <Cell ss:StyleID="date"><Data ss:Type="String">${this.escapeXml(
                        this.formatExcelDate(item.start)
                    )}</Data></Cell>
                    <Cell ss:StyleID="date"><Data ss:Type="String">${this.escapeXml(
                        this.formatExcelDate(item.end)
                    )}</Data></Cell>
                    <Cell ss:StyleID="number"><Data ss:Type="Number">${item.progress ?? 0}</Data></Cell>
                    ${timeBuckets
                        .map((bucket) => {
                            const isInRange =
                                effectiveStart &&
                                effectiveEnd &&
                                this.isBucketInRange(bucket.start, bucket.end, effectiveStart, effectiveEnd);
                            return `<Cell ss:StyleID="${isInRange ? ganttBarStyle : 'ganttCell'}">${
                                isInRange ? '<Data ss:Type="String"></Data>' : ''
                            }</Cell>`;
                        })
                        .join('')}
                </Row>`;
            })
        ].join('');

        const xml = `<?xml version="1.0"?>
            <?mso-application progid="Excel.Sheet"?>
            <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:o="urn:schemas-microsoft-com:office:office"
                xmlns:x="urn:schemas-microsoft-com:office:excel"
                xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
                xmlns:html="http://www.w3.org/TR/REC-html40">
                <Styles>
                    <Style ss:ID="Default" ss:Name="Normal">
                        <Alignment ss:Vertical="Center"/>
                        <Borders/>
                        <Font ss:FontName="Calibri" ss:Size="11"/>
                        <Interior/>
                        <NumberFormat/>
                        <Protection/>
                    </Style>
                    <Style ss:ID="header">
                        <Font ss:Bold="1" ss:Color="#FFFFFF"/>
                        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                        <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="headerDate">
                        <Font ss:Bold="1" ss:Color="#FFFFFF"/>
                        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                        <Interior ss:Color="#4F81BD" ss:Pattern="Solid"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="text">
                        <Alignment ss:Vertical="Center"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="date">
                        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="number">
                        <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="ganttCell">
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="ganttBar">
                        <Interior ss:Color="#70AD47" ss:Pattern="Solid"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                    <Style ss:ID="ganttBarPlan">
                        <Interior ss:Color="#4F81BD" ss:Pattern="Solid"/>
                        <Borders>
                            <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
                            <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
                        </Borders>
                    </Style>
                </Styles>
                <Worksheet ss:Name="Gantt">
                    <Table>
                        <Column ss:Width="240"/>
                        <Column ss:Width="85"/>
                        <Column ss:Width="85"/>
                        <Column ss:Width="60"/>
                        ${timeBuckets.map((bucket) => `<Column ss:Width="${bucket.width}"/>`).join('')}
                        ${worksheetRows}
                    </Table>
                    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
                        <FreezePanes/>
                        <FrozenNoSplit/>
                        <SplitHorizontal>1</SplitHorizontal>
                        <TopRowBottomPane>1</TopRowBottomPane>
                    </WorksheetOptions>
                </Worksheet>
            </Workbook>`;

        const fileName = this.projectId ? `timeline-${this.projectId}.xls` : 'timeline.xls';
        this.downloadFile(xml, fileName, 'application/vnd.ms-excel;charset=utf-8;');
    }

    initalPage():void {
        this.loading = true;
        this.timelineServices.getTimeline(this.projectId, this.projectType).subscribe({
        next: resp => { 
            if(resp.data!=null && resp.data!=undefined && resp.data!=""){
                const timelineItems = resp.data as GanttItem[];
                this.items = this.projectType === 'SF'
                    ? timelineItems.filter(item => this.isSfTimelineItem(item))
                    : timelineItems;

                this.items.forEach((item, index) => {
                    if (item.start == null) {
                        this.items[index].start = undefined;
                    }
                    if (item.end == null) {
                        this.items[index].end = undefined;
                    }
                });
            } 

            this.loading = false;
        },
        error: err => {
            this.loading = false;
            console.error('Error loading timeline:', err);
        }
        }); 
    }

    private isSfTimelineItem(item: GanttItem): boolean {
        const match = String(item?.title ?? '').match(/^\s*\((\d+(?:\.\d+)?)\)/);
        return match !== null && Number(match[1]) <= 6.5;
    }

    private flattenItems(items: GanttItem[], level = 0): Array<GanttItem & { level: number }> {
        return items.reduce<Array<GanttItem & { level: number }>>((result, item) => {
            result.push({ ...item, level });
            if (item.children?.length) {
                result.push(...this.flattenItems(item.children, level + 1));
            }
            return result;
        }, []);
    }

    private formatExcelDate(value?: number | Date) {
        if (!value) {
            return '';
        }

        const date = typeof value === 'number' ? new Date(value * 1000) : value;
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toISOString().slice(0, 10);
    }

    private normalizeDate(value?: number | Date) {
        if (!value) {
            return null;
        }

        const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }

    private buildTimeBuckets(viewType: GanttViewType, start: Date, end: Date) {
        switch (viewType) {
            case GanttViewType.day:
                return this.buildDayBuckets(start, end);
            case GanttViewType.week:
                return this.buildWeekBuckets(start, end);
            case GanttViewType.quarter:
                return this.buildQuarterBuckets(start, end);
            case GanttViewType.year:
                return this.buildYearBuckets(start, end);
            case GanttViewType.month:
            default:
                return this.buildMonthBuckets(start, end);
        }
    }

    private buildDayBuckets(start: Date, end: Date) {
        const buckets: Array<{ start: Date; end: Date; label: string; width: number }> = [];
        let current = new Date(start);

        while (current <= end) {
            buckets.push({
                start: new Date(current),
                end: new Date(current),
                label: this.formatExcelDate(current),
                width: 22
            });
            current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
        }

        return buckets;
    }

    private buildWeekBuckets(start: Date, end: Date) {
        const buckets: Array<{ start: Date; end: Date; label: string; width: number }> = [];
        let current = this.startOfWeek(start);

        while (current <= end) {
            const bucketStart = new Date(current);
            const bucketEnd = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 6);
            buckets.push({
                start: bucketStart,
                end: bucketEnd,
                label: `${this.formatExcelDate(bucketStart)} to ${this.formatExcelDate(bucketEnd)}`,
                width: 70
            });
            current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 7);
        }

        return buckets;
    }

    private buildMonthBuckets(start: Date, end: Date) {
        const buckets: Array<{ start: Date; end: Date; label: string; width: number }> = [];
        let current = new Date(start.getFullYear(), start.getMonth(), 1);

        while (current <= end) {
            const bucketStart = new Date(current);
            const bucketEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
            buckets.push({
                start: bucketStart,
                end: bucketEnd,
                label: this.formatMonthLabel(bucketStart),
                width: 42
            });
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }

        return buckets;
    }

    private buildQuarterBuckets(start: Date, end: Date) {
        const buckets: Array<{ start: Date; end: Date; label: string; width: number }> = [];
        let current = this.startOfQuarter(start);

        while (current <= end) {
            const bucketStart = new Date(current);
            const bucketEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0);
            buckets.push({
                start: bucketStart,
                end: bucketEnd,
                label: this.formatQuarterLabel(bucketStart),
                width: 60
            });
            current = new Date(current.getFullYear(), current.getMonth() + 3, 1);
        }

        return buckets;
    }

    private buildYearBuckets(start: Date, end: Date) {
        const buckets: Array<{ start: Date; end: Date; label: string; width: number }> = [];
        let current = new Date(start.getFullYear(), 0, 1);

        while (current <= end) {
            const bucketStart = new Date(current);
            const bucketEnd = new Date(current.getFullYear(), 11, 31);
            buckets.push({
                start: bucketStart,
                end: bucketEnd,
                label: `${bucketStart.getFullYear()}`,
                width: 55
            });
            current = new Date(current.getFullYear() + 1, 0, 1);
        }

        return buckets;
    }

    private isBucketInRange(bucketStart: Date, bucketEnd: Date, taskStart: Date, taskEnd: Date) {
        return taskStart <= bucketEnd && taskEnd >= bucketStart;
    }

    private isPlanRecord(item: GanttItem & { level: number }) {
        return (item.title || '').trim().toLowerCase().indexOf('-plan')>0;
    }

    private startOfWeek(value: Date) {
        const date = new Date(value);
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
    }

    private startOfQuarter(value: Date) {
        const quarterMonth = Math.floor(value.getMonth() / 3) * 3;
        return new Date(value.getFullYear(), quarterMonth, 1);
    }

    private formatMonthLabel(value: Date) {
        return `${value.toLocaleString('en-US', { month: 'short' })} ${value.getFullYear()}`;
    }

    private formatQuarterLabel(value: Date) {
        const quarter = Math.floor(value.getMonth() / 3) + 1;
        return `Q${quarter} ${value.getFullYear()}`;
    }

    private downloadFile(content: string, fileName: string, mimeType: string) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = fileName;
        link.click();

        URL.revokeObjectURL(url);
    }

    private escapeXml(value: string) {
        return value
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}
