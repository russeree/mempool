import { Component, OnInit, ChangeDetectionStrategy, SecurityContext, ChangeDetectorRef } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service';
import { Observable, Subject, map } from 'rxjs';
import { StateService } from '../../services/state.service';
import { HealthCheckHost } from '../../interfaces/websocket.interface';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-server-health',
  templateUrl: './server-health.component.html',
  styleUrls: ['./server-health.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServerHealthComponent implements OnInit {
  hosts$: Observable<HealthCheckHost[]>;
  tip$: Subject<number>;
  interval: number;
  now: number = Date.now();

  constructor(
    private websocketService: WebsocketService,
    private stateService: StateService,
    private cd: ChangeDetectorRef,
    public sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.hosts$ = this.stateService.serverHealth$.pipe(
      map((hosts) => {
        const subpath = window.location.pathname.slice(0, -11);
        for (const host of hosts) {
          let statusUrl = '';
          let linkHost = '';
          if (host.socket) {
            statusUrl = 'https://' + window.location.hostname + subpath + '/status';
            linkHost = window.location.hostname + subpath;
          } else {
            const hostUrl = new URL(host.host);
            statusUrl = 'https://' + hostUrl.hostname + subpath + '/status';
            linkHost = hostUrl.hostname + subpath;
          }
          host.statusPage = this.sanitizer.bypassSecurityTrustResourceUrl(this.sanitizer.sanitize(SecurityContext.URL, statusUrl));
          host.link = linkHost;
          host.flag = this.parseFlag(host.host);
        }
        return hosts;
      })
    );
    this.tip$ = this.stateService.chainTip$;
    this.websocketService.want(['mempool-blocks', 'stats', 'blocks', 'tomahawk']);

    this.interval = window.setInterval(() => {
      this.now = Date.now();
      this.cd.markForCheck();
    }, 1000);
  }

  trackByFn(index: number, host: HealthCheckHost): string {
    return host.host;
  }

  getLastUpdateSeconds(host: HealthCheckHost): string {
    if (host.lastChecked) {
      const seconds = Math.ceil((this.now - host.lastChecked) / 1000);
      return `${seconds} second${seconds > 1 ? 's' : '  '} ago`;
    } else {
      return '~';
    }
  }

  private parseFlag(host: string): string {
    if (host.includes('.fra.')) {
      return '🇩🇪';
    } else if (host.includes('.tk7.')) {
      return '🇯🇵';
    } else if (host.includes('.fmt.')) {
      return '🇺🇸';
    } else if (host.includes('.va1.')) {
      return '🇺🇸';
    } else {
      return '';
    }
  }
}
