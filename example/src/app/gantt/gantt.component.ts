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

    initalPage():void {
        this.loading = true;
        this.timelineServices.getTimeline(this.projectId).subscribe({
        next: resp => { 
            if(resp.data!=null && resp.data!=undefined && resp.data!=""){
                this.items = resp.data;

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
 
}
