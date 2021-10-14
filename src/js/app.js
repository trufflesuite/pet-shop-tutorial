App = {
  web3Provider: null,
  web3 = null,
  account: null,
  contracts: {},

  init: async function() {
    // Load pets.
    $.getJSON('pets.json', function(data) {
      var petsRow = $('#petsRow');
      var petTemplate = $('#petTemplate');

      for (i = 0; i < data.length; i ++) {
        petTemplate.find('.panel-title').text(data[i].name);
        petTemplate.find('img').attr('src', data[i].picture);
        petTemplate.find('.pet-breed').text(data[i].breed);
        petTemplate.find('.pet-age').text(data[i].age);
        petTemplate.find('.pet-location').text(data[i].location);
        petTemplate.find('.btn-adopt').attr('data-id', data[i].id);

        petsRow.append(petTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function() {
    // Initialize App's web3Provider
    App.web3Provider = await detectEthereumProvider()

    if (App.web3Provider) {
      // Track if user changes account in Metamask
      App.web3Provider.on("accountsChanged", (accounts) => {
        if (accounts.length > 0)
          App.account = accounts[0]
      })
      // Anchor web3 in App
      App.web3 = new Web3(App.web3Provider);
      // Trigger metamask to prompt for connecting accounts
      try {
        let accs = await ethereum.request({ method: 'eth_requestAccounts' });
        App.account = accs[0]
      } catch {
        console.error('Something funny with your wallet. Install metamask?')
      }
    } else {
      // This shouldn't be in a prod app.
      console.warn("No web3 detected. Falling back to http://127.0.0.1:8545. You should remove this fallback when you deploy live",);
      App.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"),);
    }

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Adoption.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with truffle-contract
      var AdoptionArtifact = data;
      App.contracts.Adoption = TruffleContract(AdoptionArtifact);

      // Set the provider for our contract
      App.contracts.Adoption.setProvider(App.web3Provider);

      // Use our contract to retrieve and mark the adopted pets
      return App.markAdopted();
    });

    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-adopt', App.handleAdopt);
  },

  markAdopted: function(adopters, account) {
    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;

      return adoptionInstance.getAdopters.call();
    }).then(function(adopters) {
      for (i = 0; i < adopters.length; i++) {
        if (adopters[i] !== '0x0000000000000000000000000000000000000000') {
          $('.panel-pet').eq(i).find('button').text('Success').attr('disabled', true);
        }
      }
    }).catch(function(err) {
      console.log(err.message);
    });
  },

  handleAdopt: function(event) {
    event.preventDefault();

    var petId = parseInt($(event.target).data('id'));

    var adoptionInstance;

    App.contracts.Adoption.deployed().then(function(instance) {
      adoptionInstance = instance;

      // Execute adopt as a transaction by sending account
      return adoptionInstance.adopt(petId, {from: App.account});
    }).then(function(result) {
      return App.markAdopted();
    }).catch(function(err) {
      console.log(err.message);
    });
  }

};

$(function() {
  $(window).load(function() {
    App.init();
  });
});
