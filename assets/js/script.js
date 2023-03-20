let promise = async(url) => {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: url,
            type: 'GET',
            success: (res) => {
                resolve(res);
            },
            error: (err) => {
                reject(err);
            }
        });
    });
}
let getChannels = async() => {
    return await promise('https://iptv-org.github.io/api/channels.json');
}

let getStreams = async() => {
    return await promise('https://iptv-org.github.io/api/streams.json');
}

let getCountries = async() => {
    return await promise('https://iptv-org.github.io/api/countries.json');
}

let updateQuality = (newQuality) => {
    window.hls.levels.forEach((level, levelIndex) => {
        if (level.height === newQuality) {
            console.log("Found quality match with " + newQuality);
            window.hls.currentLevel = levelIndex;
        }
    });
}

let check = (id, channelName, source) => {
    $.ajax({
        url: source,
        type: 'GET',
        beforeSend: () => {
            $(`#${id}`).html(`
                <div class="spinner-border" role="status">
                    <span class="sr-only"></span>
                </div>
            `);
        },
        success: (res) => {
            $('.toast-body').html('This stream is available now');
            $('#streamToast').toast({ delay: 2000 });
            $('#streamToast').toast('show');
            $(`#${id}`).html(`<button class="btn btn-success" onclick="play('${channelName}','${source}');" data-toggle="modal" data-target="#streamModal">Stream <i class="bi bi-box-arrow-up-right"></i></button>`);
        },
        error: (err) => {
            $('.toast-body').html('This stream is not available now');
            $('#streamToast').toast('show');
            $(`#${id}`).html(`<p class="text text-danger">Not Available</p>`);
        }
    });
}

let video = document.querySelector("video");
let player = new Plyr('#streamTV');

let play = (channelName, source) => {
    $('#streamModalLabel').html(channelName);
    const defaultOptions = {};

    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(source);
        hls.on(Hls.Events.MANIFEST_PARSED, function(event, data) {

            const availableQualities = hls.levels.map((l) => l.height)

            defaultOptions.quality = {
                default: availableQualities[0],
                options: availableQualities,
                forced: true,
                onChange: (e) => updateQuality(e),
            }
            player = new Plyr(video, defaultOptions);
        });
        hls.attachMedia(video);
        window.hls = hls;
    } else {
        player = new Plyr(video, defaultOptions);
    }
    player.play();
}

$('#streamModal').on('hidden.bs.modal', function() {
    $('video').trigger('pause');
});

(async() => {
    let channels = await getChannels();
    let streams = await getStreams();
    let countries = await getCountries();

    let t = $('#all-tv').DataTable();
    let counter = 0;
    channels.forEach((channelData) => {
        let streamData = streams.filter(stream => stream.channel === channelData.id)[0] || '';
        let countryData = countries.filter(country => country.code === channelData.country)[0] || '';
        if (streamData && countryData && !channelData.is_nsfw) {
            let channel = channelData.name;
            let logo = `
                    <div class="magic-box">
                        <img src="${channelData.logo}" class="magic-image" />
                    </div>
                `;
            let country = `${countryData.flag} ${countryData.name}`;
            let stream = `<div id="stream-${counter}"><button class="btn btn-primary" onclick="check('stream-${counter}','${channelData.name}','${streamData.url}')">Check Status <i class="bi bi-shield-check"></i></button></div>`;
            t.row.add([
                '',
                channel,
                logo,
                country,
                stream
            ]);
            counter++;
        }
    });

    t.on('order.dt search.dt', () => {
        t.column(0, { search: 'applied', order: 'applied' }).nodes().each((cell, i) => {
            cell.innerHTML = i + 1;
        });
    }).draw();
})();